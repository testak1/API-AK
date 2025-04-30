// pages/api/engines.ts
import { NextApiRequest, NextApiResponse } from 'next';
import client from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand, model, year } = req.query;
  if (!brand || !model || !year) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const query = `
    *[_type == "brand" && name == $brand][0]{
      name,
      "models": models[name == $model]{
        name,
        "slug": name,
        "years": years[range == $year]{
          range,
          "slug": range,
          "engines": engines[]{
            _id,
            _key,
            label,
            fuel,
            "slug": label,
            "stages": stages[]{
              name,
              "slug": name,
              origHk,
              tunedHk,
              origNm,
              tunedNm,
              price,
              description,
              descriptionRef->{
                _id,
                stageName,
                description
              },
              "aktPlusOptions": *[_type == "aktPlus" && (
                isUniversal == true || 
                ^.^.fuel in applicableFuelTypes
              ) && (
                !defined(stageCompatibility) || 
                stageCompatibility == ^.name
              )]{
                _id,
                title,
                price,
                isUniversal,
                applicableFuelTypes,
                stageCompatibility,
                description,
                gallery[]{
                  _key,
                  alt,
                  caption,
                  "asset": asset->{
                    _id,
                    url
                  }
                },
                compatibilityNotes
              }
            },
            "globalAktPlusOptions": *[_type == "aktPlus" && (
              isUniversal == true || 
              ^.fuel in applicableFuelTypes
            ) && !defined(stageCompatibility)]{
              _id,
              title,
              price,
              isUniversal,
              applicableFuelTypes,
              stageCompatibility,
              description,
              gallery[]{
                _key,
                alt,
                caption,
                "asset": asset->{
                  _id,
                  url
                }
              },
              compatibilityNotes
            }
          }
        }
      }
    }.models[0].years[0].engines
  `;

  try {
    const result = await client.fetch(query, { brand, model, year });
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error fetching engines:', error);
    res.status(500).json({ error: 'Failed to load engines' });
  }
}
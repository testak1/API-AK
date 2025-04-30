// pages/api/engines.ts
import { NextApiRequest, NextApiResponse } from 'next';
import client from '@/lib/sanity';

// GROQ slugify inline function
const query = `
  *[_type == "brand" && name == $brand][0]
    .models[name == $model][0]
    .years[range == $year][0]
    .engines[]{
      _id,
      _key,
      label,
      fuel,
      "slug": lower(
        replace(
          replace(label, "[^a-zA-Z0-9\\s-]", ""),
          "\\s+",
          "-"
        )
      ),
      "stages": stages[]{
        name,
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
`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand, model, year } = req.query;
  if (!brand || !model || !year) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const result = await client.fetch(query, { brand, model, year });
    res.status(200).json({ result });
  } catch (error) {
    console.error('Error fetching engines:', error);
    res.status(500).json({ error: 'Failed to load engines' });
  }
}

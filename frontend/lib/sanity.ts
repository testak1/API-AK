// lib/sanity.ts
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { Brand } from '@/types/sanity';

const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

export async function getAllBrandsWithDetails(): Promise<Brand[]> {
  const query = `*[_type == "brand"]{
    _id,
    _type,
    name,
    "slug": slug.current,
    logo {
      asset->{
        _ref
      },
      alt
    },
    "models": models[]{
      name,
      "years": years[]{
        range,
        "engines": engines[]{
          fuel,
          label,
          "globalAktPlusOptions": globalAktPlusOptions[]->{
            _id,
            _type,
            title,
            isUniversal,
            applicableFuelTypes,
            description,
            "gallery": gallery[]{
              _key,
              "asset": asset->{
                _ref
              },
              alt,
              caption
            },
            price,
            installationTime,
            compatibilityNotes
          },
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
            "aktPlusOptions": aktPlusOptions[]->{
              _id,
              _type,
              title,
              isUniversal,
              applicableFuelTypes,
              stageCompatibility,
              description,
              "gallery": gallery[]{
                _key,
                "asset": asset->{
                  _ref
                },
                alt,
                caption
              },
              price,
              installationTime,
              compatibilityNotes
            }
          }
        }
      }
    }
  }`;

  return client.fetch(query);
}
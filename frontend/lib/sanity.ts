import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';


const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
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
    name,
    "slug": slug.current,
    "models": models[]{
      name,
      "years": years[]{
        range,
        "engines": engines[]{
          fuel,
          label,
          "globalAktPlusOptions": globalAktPlusOptions[]->{
            _id,
            title,
            description,
            "gallery": gallery[]{
              _key,
              "asset": asset->{
                _ref
              },
              alt
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
            "aktPlusOptions": aktPlusOptions[]->{
              _id,
              title,
              description,
              "gallery": gallery[]{
                _key,
                "asset": asset->{
                  _ref
                },
                alt
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
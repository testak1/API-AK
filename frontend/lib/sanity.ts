// lib/sanity.ts
import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { Brand } from '@/types/sanity';

// Define Reference type locally since we're not importing it
interface Reference {
  _type: 'reference';
  _ref: string;
  _key?: string;
  _weak?: boolean;
}

interface SanityImage {
  _key?: string;
  _type: 'image';
  asset: Reference;
  alt?: string;
  caption?: string;
}

const config: ClientConfig = {
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
  ignoreBrowserTokenWarning: true
};

const client: SanityClient = createClient(config);
const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImage | Reference | string) {
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

  try {
    const results = await client.fetch<Brand[]>(query);
    if (!results || !Array.isArray(results)) {
      throw new Error('Invalid data format received from Sanity');
    }
    return results;
  } catch (error) {
    console.error('Error fetching brands:', error);
    throw new Error('Failed to load brand data');
  }
}

// Utility functions
export async function getBrandBySlug(slug: string): Promise<Brand | null> {
  const query = `*[_type == "brand" && slug.current == $slug][0]`;
  return client.fetch<Brand | null>(query, { slug });
}

export default client;
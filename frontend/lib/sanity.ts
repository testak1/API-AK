// lib/sanity.ts
import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';

// Configuration matching your studio
const config = {
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
};

// Create and export the typed client
export const client: SanityClient = createClient(config);

// Image URL builder
export function urlFor(source: any): ImageUrlBuilder {
  return imageUrlBuilder(client).image(source);
}

// Core query function with error handling
export async function fetchSanityQuery<T = any>(
  query: string,
  params?: Record<string, unknown>
): Promise<T> {
  try {
    return await client.fetch<T>(query, params);
  } catch (error) {
    console.error('Sanity query error:', error);
    throw new Error(error instanceof Error ? error.message : 'Query failed');
  }
}

// Specific query for brands with all relations
export async function getAllBrandsWithDetails(): Promise<any[]> {
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
              "url": asset->url,
              "alt": alt
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
            "description": descriptionRef->description,
            "aktPlusOptions": aktPlusOptions[]->{
              _id,
              title,
              description,
              "gallery": gallery[]{
                _key,
                "url": asset->url,
                "alt": alt
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

  return fetchSanityQuery<any[]>(query);
}
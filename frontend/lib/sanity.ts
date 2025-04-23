// lib/sanity.ts
import { createClient, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';

// Type-safe configuration
const config = {
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01', // Must match your studio config
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
};

// Explicitly type the client
export const client: SanityClient = createClient(config);

// Image URL builder with proper typing
export function urlFor(source: any): ImageUrlBuilder {
  const builder = imageUrlBuilder(client);
  return builder.image(source);
}

// Type-safe fetch wrapper
export async function fetchSanityQuery<T = any>(
  query: string,
  params?: Record<string, unknown>
): Promise<T> {
  try {
    return await client.fetch<T>(query, params);
  } catch (error) {
    console.error('Sanity query error:', error);
    throw error;
  }
}

// Utility for fetching all brands with proper typing
export async function getAllBrands(): Promise<Brand[]> {
  const query = `*[_type == "brand"]{
    name,
    models[] {
      name,
      years[] {
        range,
        engines[] {
          fuel,
          label,
          globalAktPlusOptions[]->,
          stages[] {
            name,
            origHk,
            tunedHk,
            origNm,
            tunedNm,
            price,
            descriptionRef->,
            aktPlusOptions[]->
          }
        }
      }
    }
  }`;
  return fetchSanityQuery<Brand[]>(query);
}
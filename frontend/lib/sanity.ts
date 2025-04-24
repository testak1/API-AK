// lib/sanity.ts
import { createClient, type ClientConfig, type SanityClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { Brand, SanityImage, StageDescription } from '@/types/sanity';

// Strongly typed client configuration
const config: ClientConfig = {
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
  ignoreBrowserTokenWarning: true // Add if using in browser
};

const client: SanityClient = createClient(config);

// Initialize image URL builder with proper typing
const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImage | Reference | string) {
  return builder.image(source);
}

// Utility type for GROQ results
type GroqResult<T> = Promise<T>;

// Main query function with improved typing
export async function getAllBrandsWithDetails(): GroqResult<Brand[]> {
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
    
    // Validate we got results
    if (!results || !Array.isArray(results)) {
      throw new Error('Invalid data format received from Sanity');
    }

    return results;
  } catch (error) {
    console.error('Error fetching brands from Sanity:', error);
    throw new Error('Failed to load brand data');
  }
}

// Optional: Add caching layer
const cache = new Map<string, any>();

export async function cachedFetch<T>(query: string, params?: Record<string, unknown>): GroqResult<T> {
  const cacheKey = JSON.stringify({ query, params });
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const result = await client.fetch<T>(query, params);
  cache.set(cacheKey, result);
  return result;
}

// Utility functions for common queries
export async function getBrandBySlug(slug: string): GroqResult<Brand | null> {
  const query = `*[_type == "brand" && slug.current == $slug][0]`;
  return client.fetch<Brand | null>(query, { slug });
}

export async function getStageDescriptions(ids: string[]): GroqResult<StageDescription[]> {
  const query = `*[_type == "stageDescription" && _id in $ids]`;
  return client.fetch<StageDescription[]>(query, { ids });
}

// Export configured client
export { client };
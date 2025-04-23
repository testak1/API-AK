// lib/sanity.ts
import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: 'wensahkh', // Must match your sanity.config.ts
  dataset: 'production', // Must match your sanity.config.ts
  apiVersion: '2023-01-01', // Use current date in production
  useCdn: process.env.NODE_ENV === 'production', // Enable CDN in production
  token: process.env.SANITY_API_TOKEN // Optional for private datasets
});

const builder = imageUrlBuilder(client);

// Helper function for generating image URLs
export function urlFor(source: any) {
  return builder.image(source);
}

// GROQ query helper
export async function fetchQuery(query: string, params = {}) {
  try {
    return await client.fetch(query, params);
  } catch (error) {
    console.error('Sanity fetch error:', error);
    throw error;
  }
}
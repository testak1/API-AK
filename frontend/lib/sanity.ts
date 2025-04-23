// lib/sanity.ts
import { createClient, type ClientConfig } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';
import type { ImageUrlBuilder } from '@sanity/image-url/lib/types/builder';

// Type-safe configuration
const config: ClientConfig = {
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2024-01-01', // Match your Studio version
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN,
};

// Create the client
export const client = createClient(config);

// Image URL builder with proper typing
export function urlFor(source: any): ImageUrlBuilder {
  return imageUrlBuilder(client).image(source);
}

// Type-safe fetch wrapper
export async function fetchQuery<T = any>(
  query: string,
  params?: Record<string, unknown>
): Promise<T> {
  if (!client) throw new Error('Sanity client not initialized');
  return client.fetch<T>(query, params);
}
import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: 'wensahkh', // From your Sanity URL
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: true, // Enable CDN for faster responses
});
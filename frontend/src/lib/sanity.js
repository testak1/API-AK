import { createClient } from '@sanity/client';

export const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2025-04-23',
  useCdn: true,
});

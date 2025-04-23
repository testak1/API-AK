import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: true
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}
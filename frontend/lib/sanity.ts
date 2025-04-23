import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

const sanityClient = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2024-01-01',
  useCdn: true
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}
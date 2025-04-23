// types/sanity.d.ts
import type { AktPlusOption, Brand } from '@/schemas';

declare module '@/lib/sanity' {
  export const client: import('@sanity/client').SanityClient;
  export function urlFor(source: any): import('@sanity/image-url').ImageUrlBuilder;
}
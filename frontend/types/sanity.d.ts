// types/sanity.d.ts
import type { ClientConfig, SanityClient } from '@sanity/client';
import type { ImageUrlBuilder } from '@sanity/image-url';

declare module '@/lib/sanity' {
  export const client: SanityClient;
  export function urlFor(source: any): ImageUrlBuilder;
  export function fetchQuery<T = any>(
    query: string,
    params?: Record<string, unknown>
  ): Promise<T>;
}
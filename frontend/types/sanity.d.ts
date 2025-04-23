// types/sanity.d.ts
import type { AktPlusOption, Brand, Engine, Model, Stage, Year } from '@/schemas';

declare module '@/lib/sanity' {
  export const client: import('@sanity/client').SanityClient;
  export function urlFor(source: any): import('@sanity/image-url').ImageUrlBuilder;
  export function fetchSanityQuery<T = any>(
    query: string,
    params?: Record<string, unknown>
  ): Promise<T>;
  export function getAllBrands(): Promise<Brand[]>;
}
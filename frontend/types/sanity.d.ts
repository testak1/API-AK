// types/sanity.d.ts
import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  _key: string;
  asset: {
    _ref: string;
  };
  alt?: string;
}

export interface AktPlusOption {
  _id: string;
  title: string;
  description?: PortableTextBlock[];
  gallery?: SanityImage[];
  price?: number;
  installationTime?: number;
  compatibilityNotes?: string;
}

export interface Stage {
  name: string;
  origHk: number;
  origNm: number;
  tunedHk: number;
  tunedNm: number;
  price: number;
  description?: PortableTextBlock[];
  aktPlusOptions?: AktPlusOption[];
}

export interface Engine {
  name: string;
  fuel: string;
  stages: Stage[];
  globalAktPlusOptions?: AktPlusOption[];
}

export interface Year {
  range: string;
  engines: Engine[];
}

export interface Model {
  name: string;
  years: Year[];
}

export interface Brand {
  _id: string;
  name: string;
  slug: string;
  models: Model[];
}

declare module '@/lib/sanity' {
  export const client: import('@sanity/client').SanityClient;
  export function urlFor(source: import('sanity').SanityImageSource): import('@sanity/image-url').ImageUrlBuilder;
  export function getAllBrandsWithDetails(): Promise<Brand[]>;
}
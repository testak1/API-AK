// types/sanity.d.ts
import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  _key: string;
  asset: {
    _ref: string;
  };
  alt?: string;
  caption?: string;
}

export interface AktPlusOption {
  _id: string;
  _type: 'aktPlus';
  title: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  isUniversal?: boolean;
  applicableFuelTypes?: string[];
  stageCompatibility?: string;
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
  descriptionRef?: {
    _type: 'reference';
    _ref: string;
  };
  aktPlusOptions?: Array<{
    _type: 'reference';
    _ref: string;
    _key: string;
  } | AktPlusOption>;
}

export interface Engine {
  label: string;
  fuel: 'diesel' | 'petrol' | 'hybrid' | 'electric';
  stages: Stage[];
  globalAktPlusOptions?: Array<{
    _type: 'reference';
    _ref: string;
    _key: string;
  } | AktPlusOption>;
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
  _type: 'brand';
  name: string;
  slug: {
    _type: 'slug';
    current: string;
  };
  logo?: {
    _type: 'image';
    asset: {
      _ref: string;
    };
    alt?: string;
  };
  models: Model[];
}

declare module '@/lib/sanity' {
  export const client: import('@sanity/client').SanityClient;
  export function urlFor(source: import('sanity').SanityImageSource): import('@sanity/image-url').ImageUrlBuilder;
  export function getAllBrandsWithDetails(): Promise<Brand[]>;
}
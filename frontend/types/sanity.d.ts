import type { PortableTextBlock } from '@portabletext/types';

export interface SanityImage {
  _key?: string;
  _type?: 'image';
  asset: {
    _ref?: string;
    _id?: string;
    url?: string;
  };
  alt?: string;
  caption?: string;
}

export interface Reference {
  _type: 'reference';
  _ref: string;
  _key?: string;
  _weak?: boolean;
}

export interface Slug {
  _type: 'slug';
  current: string;
}

export interface StageDescription {
  _id: string;
  _type: 'stageDescription';
  stageName: string;
  description: PortableTextBlock[] | string;
}

export interface AktPlusOption {
  _id: string;
  _type: 'aktPlus';
  title: string;
  slug: Slug;
  isUniversal: boolean;
  applicableFuelTypes?: string[];
  stageCompatibility?: string;
  description?: PortableTextBlock[];
  gallery?: SanityImage[];
  price: number;
  installationTime?: number;
  compatibilityNotes?: string;
  manualAssignments?: Reference[];
}

export type AktPlusOptionReference = Reference | AktPlusOption;

export interface Stage {
  name: string;
  origHk: number;
  origNm: number;
  tunedHk: number;
  tunedNm: number;
  price: number;
  description?: PortableTextBlock[];
  descriptionRef?: StageDescription | null;
  aktPlusOptions?: AktPlusOptionReference[];
}

export interface Engine {
  _id?: string; // Optional if generated dynamically in nested objects
  label: string;
  fuel: 'diesel' | 'bensin' | 'hybrid' | 'electric';
  stages: Stage[];
  globalAktPlusOptions?: AktPlusOptionReference[];
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
  slug: Slug;
  logo?: {
    _type: 'image';
    asset: Reference;
    alt?: string;
  };
  models: Model[];
}

// Image URL builder types
declare module '@sanity/image-url' {
  interface ImageUrlBuilder {
    image(source: SanityImageSource): this;
    width(pixels: number): this;
    height(pixels: number): this;
    fit(mode: 'clip' | 'crop' | 'fill' | 'fillmax' | 'max' | 'scale' | 'min'): this;
    quality(percentage: number): this;
    format(type: 'jpg' | 'png' | 'webp' | 'avif'): this;
    url(): string;
  }
}

declare module '@/lib/sanity' {
  export const client: import('@sanity/client').SanityClient;
  export function urlFor(source: import('sanity').SanityImageSource): import('@sanity/image-url').ImageUrlBuilder;
  export function getAllBrandsWithDetails(): Promise<Brand[]>;
}

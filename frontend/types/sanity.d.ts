// types/sanity.d.ts
import type { PortableTextBlock } from "@portabletext/types";
import { Image } from "@sanity/types";

export interface SanityImage {
  _key?: string;
  _type?: "image";
  asset: {
    _id: string;
    url: string;
  };
  alt?: string;
  caption?: string;
}

export interface Reference {
  _type: "reference";
  _ref: string;
  _key?: string;
  _weak?: boolean;
}

export interface Slug {
  _type: "slug";
  current: string;
}

export interface Station {
  _id: string;
  city: string;
  slug: {
    current: string;
  };
  phone: string;
  address: {
    street: string;
    postalCode: string;
  };
  location: {
    lat: number;
    lng: number;
  };
  instagramUrl?: string;
  openingHours: {
    days: string[];
    open: string;
    close: string;
  }[];
  services: {
    title: string;
    description: any;
  }[];
  testimonials: {
    name: string;
    vehicle: string;
    quote: string;
  }[];
  gallery: {
    asset: {
      _ref: string;
    };
    alt?: string;
  }[];
  featuredImage?: {
    asset: {
      _ref: string;
    };
    alt?: string;
  };
  content?: any;
  brands: Brand[];
}

export interface StageDescription {
  _id: string;
  _type: "stageDescription";
  stageName: string;
  description: PortableTextBlock[] | string;
}

export interface AktPlusOption {
  _id: string;
  _type: "aktPlus";
  title: string;
  slug?: Slug;
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

export interface AktPlusResolved {
  id: string;
  title: string;
  description: PortableTextBlock[];
  isOverride: boolean;
  price: number;
  imageUrl: string | null;
  installationTime: number;
}

export interface DisplaySettings {
  showAktPlus: boolean;
  showBrandLogo: boolean;
  showStageLogo: boolean;
  showDynoChart: boolean;
}

export interface ResellerConfig {
  email: string;
  logo?: any;
  currency: string;
  aktPlusLogo: {
    _type: "image";
    asset: {
      _type: "reference";
      _ref: imageAsset._id;
    };
  };
  subscription: {
    currency: number;
    planType: string;
    price: number;
  };

  language: string;
  exchangeRates: Record<string, number>;
  displaySettings: {
    showAktPlus: boolean;
    showBrandLogo: boolean;
    showStageLogo: boolean;
    showDynoChart: boolean;
  };
}

export type AktPlusOptionReference = Reference | AktPlusOption;

export interface Stage {
  name: string;
  slug?: string;
  origHk?: number;
  origNm?: number;
  tunedHk?: number;
  tunedNm?: number;
  price?: number;
  description?: PortableTextBlock[];
  descriptionRef?: StageDescription | null;
  aktPlusOptions?: AktPlusOptionReference[];
  type?: "performance" | "tcu";
  tcuFields?: {
    launchControl?: {
      original?: string;
      optimized?: string;
    };
    rpmLimit?: {
      original?: string;
      optimized?: string;
    };
    shiftTime?: {
      original?: string;
      optimized?: string;
    };
  };
}

export interface Engine {
  _id?: string;
  _key?: string;
  label: string;
  fuel: "Diesel" | "Bensin" | "Hybrid" | "Electric";
  slug: string;
  stages: Stage[];
  globalAktPlusOptions?: AktPlusOptionReference[];
}

export interface Year {
  range: string;
  slug?: string;
  engines: Engine[];
}

export interface Model {
  name: string;
  slug?: Slug;
  years: Year[];
}

export interface Brand {
  _id: string;
  _type: "brand";
  name: string;
  slug: Slug;
  logo?: {
    _type: "image";
    asset: Reference;
    alt?: string;
  };
  models: Model[];
}

// Sanity Image URL Builder Support
declare module "@sanity/image-url" {
  interface ImageUrlBuilder {
    image(source: SanityImageSource): this;
    width(pixels: number): this;
    height(pixels: number): this;
    fit(
      mode: "clip" | "crop" | "fill" | "fillmax" | "max" | "scale" | "min",
    ): this;
    quality(percentage: number): this;
    format(type: "jpg" | "png" | "webp" | "avif"): this;
    url(): string;
  }
}

declare module "@/lib/sanity" {
  export const client: import("@sanity/client").SanityClient;
  export function urlFor(
    source: import("sanity").SanityImageSource,
  ): import("@sanity/image-url").ImageUrlBuilder;
  export function getAllBrandsWithDetails(): Promise<Brand[]>;
}

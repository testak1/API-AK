export const normalizeBrandSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[lastbil\]/g, "lastbil")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// Increment when any file in public/brand-logos-png is replaced. This gives
// Next Image and the deployment CDN a fresh cache key without a full cache clear.
export const BRAND_LOGO_VERSION = "2026-10-07-1";

export const getBrandLogoUrl = (brandOrSlug: string) =>
  `/brand-logos-png/${normalizeBrandSlug(brandOrSlug)}.png?v=${BRAND_LOGO_VERSION}`;

const WHITE_ON_DARK_BRANDS = new Set([
  "audi",
  "cupra",
  "jaguar",
  "maserati",
  "mclaren",
  "nissan",
  "toyota",
]);

export const needsWhiteBrandLogo = (brandOrSlug: string) =>
  WHITE_ON_DARK_BRANDS.has(normalizeBrandSlug(brandOrSlug));

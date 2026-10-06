export const normalizeBrandSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[lastbil\]/g, "lastbil")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const getBrandLogoUrl = (brandOrSlug: string) =>
  `/brand-logos-png/${normalizeBrandSlug(brandOrSlug)}.png`;

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

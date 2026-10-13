const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

// The source images below have the front of the vehicle pointing right.
// Flip them at render time so every model consistently points left.
const RIGHT_FACING_MODEL_IMAGES = new Set([
  "kia:ceedproceed",
  "lexus:gs",
  "lexus:nx",
  "lotus:elise",
  "lotus:evora",
  "lotus:exige",
  "nissan:leaf",
  "nissan:np300navara",
  "nissan:nv300",
  "volvo:s60",
  "volvo:v40",
  "volvo:v40v40cc",
  "volvo:v60",
  "volvo:s60v60",
  "volvo:xc40",
  "volvo:xc60",
  "volvo:xc90",
]);

export const shouldFlipModelImage = (brand: string, model: string) =>
  RIGHT_FACING_MODEL_IMAGES.has(`${normalize(brand)}:${normalize(model)}`);

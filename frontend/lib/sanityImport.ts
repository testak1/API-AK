import {createClient} from "@sanity/client";

export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET || "production",
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2025-04-23",
  useCdn: false,
});

// Lightweight query för compare
export async function getAllData() {
  const query = `*[_type == "brand"]{
    _id,
    name,
    "models": models[]{
      name,
      "years": years[]{
        range,
        "engines": engines[]{
          label,
          fuel
        }
      }
    }
  }`;
  return sanity.fetch(query);
}

// Detailed query för import-verifiering
export async function getBrandDetails(brandName: string) {
  const query = `*[_type == "brand" && lower(name) == lower($brandName)][0]{
    _id,
    name,
    models[]{
      name,
      years[]{
        range,
        engines[]{
          label,
          fuel,
          stages[]{
            name,
            origHk,
            tunedHk,
            origNm,
            tunedNm,
            price
          }
        }
      }
    }
  }`;
  return sanity.fetch(query, {brandName});
}

// Validera att import lyckades
export async function verifyImport(
  brandName: string,
  modelName: string,
  yearRange: string,
  engineLabel: string
) {
  const brand = await getBrandDetails(brandName);

  if (!brand) return false;

  const model = brand.models?.find(
    (m: any) => m.name.toLowerCase() === modelName.toLowerCase()
  );

  if (!model) return false;

  const year = model.years?.find(
    (y: any) => y.range.toLowerCase() === yearRange.toLowerCase()
  );

  if (!year) return false;

  const engine = year.engines?.find(
    (e: any) =>
      e.label.toLowerCase().includes(engineLabel.toLowerCase()) ||
      engineLabel.toLowerCase().includes(e.label.toLowerCase())
  );

  return !!engine;
}

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

// Lägg till engine - den funktion som saknades
export async function addEngine(
  brand: string,
  model: string,
  year: string,
  engine: any
) {
  // Hämta brand dokumentet
  const brandDoc = await sanity.fetch(
    `*[_type == "brand" && lower(name) == lower($brand)][0]{
      _id,
      models
    }`,
    {brand}
  );

  if (!brandDoc?._id) {
    throw new Error(`Brand '${brand}' hittades inte`);
  }

  // Hitta model index
  const modelIndex = brandDoc.models?.findIndex(
    (m: any) => m?.name?.toLowerCase() === model?.toLowerCase()
  );

  if (modelIndex === -1) {
    throw new Error(`Model '${model}' hittades inte i brand '${brand}'`);
  }

  // Hitta year index
  const yearIndex = brandDoc.models[modelIndex].years?.findIndex(
    (y: any) => y?.range?.toLowerCase() === year?.toLowerCase()
  );

  if (yearIndex === -1) {
    throw new Error(`Year '${year}' hittades inte i model '${model}'`);
  }

  // Skapa ny engine
  const newEngine = {
    _key: generateKey(),
    label: engine.label,
    fuel: engine.fuel || "Bensin",
    stages: [
      {
        _key: generateKey(),
        name: "Steg 1",
        type: "performance",
        origHk: engine.origHk,
        tunedHk: engine.tunedHk,
        origNm: engine.origNm,
        tunedNm: engine.tunedNm,
        price: engine.price,
      },
    ],
  };

  // Lägg till engine i befintlig year
  return sanity
    .patch(brandDoc._id)
    .append(`models[${modelIndex}].years[${yearIndex}].engines`, [newEngine])
    .commit();
}

// Hjälpfunktion för att generera unika keys
function generateKey(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

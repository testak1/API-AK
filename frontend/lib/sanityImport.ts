import { createClient } from "@sanity/client";

export const sanity = createClient({
  projectId: process.env.SANITY_PROJECT_ID!,
  dataset: process.env.SANITY_DATASET || "production",
  token: process.env.SANITY_WRITE_TOKEN,
  apiVersion: "2023-10-01",
  useCdn: false,
});

export async function getAllData() {
  const query = `*[_type == "brand"]{
    name,
    "models": models[]{
      name,
      "years": years[]{
        range,
        "engines": engines[]{label, fuel}
      }
    }
  }`;
  return sanity.fetch(query);
}

export async function addEngine(brand: string, model: string, year: string, engine: any) {
  const patchQuery = `
    *[_type == "brand" && name == $brand][0].models[name == $model].years[range == $year]
  `;
  const doc = await sanity.fetch(patchQuery, { brand, model, year });
  if (!doc) throw new Error("Ingen matchande årmodell hittades");

  const newEngine = {
    _key: crypto.randomUUID(),
    label: engine.label,
    fuel: engine.fuel,
    stages: [
      {
        _key: crypto.randomUUID(),
        name: "Steg 1",
        origHk: engine.origHk,
        tunedHk: engine.tunedHk,
        origNm: engine.origNm,
        tunedNm: engine.tunedNm,
        price: engine.price,
      },
    ],
  };

  return sanity
    .patch(doc._id)
    .append("engines", [newEngine])
    .commit();
}

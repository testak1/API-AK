// pages/api/all-vehicles.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {groq} from "next-sanity";
import client from "@/lib/sanity";

// Updated query using supported GROQ functions
const allVehiclesQuery = groq`
*[_type == "brand" && !(_id in path("drafts.**"))] {
  "brandName": name,
  "brandSlug": slug.current,
  "models": models[] {
    "modelName": name,
    "modelSlug": select(
      defined(slug.current) => slug.current,
      defined(slug) => slug.current,
      lower(name)
    ),
    "years": years[] {
      "yearRange": range,
      "yearSlug": select(
        defined(slug) => slug,
        range
      ),
      "engines": engines[] {
        "engineLabel": label,
        "engineSlug": select(
          defined(slug) => slug,
          lower(label)
        ),
        "engineFuel": fuel,
        "engineHp": stages[0].origHk,
      }
    }
  }
}`;

// Post-process the data to clean up slugs
function cleanSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-") // Replace special chars with -
    .replace(/-+/g, "-") // Remove consecutive -
    .replace(/^-|-$/g, ""); // Remove leading/trailing -
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const nestedVehicles = await client.fetch(allVehiclesQuery);

    // Flatten and clean the slugs
    const flatVehicles = nestedVehicles
      .flatMap(brand =>
        brand.models?.flatMap(model =>
          model.years?.flatMap(year =>
            year.engines?.map(engine => ({
              engineLabel: engine.engineLabel,
              engineSlug: cleanSlug(engine.engineSlug || engine.engineLabel),
              engineFuel: engine.engineFuel,
              engineHp: engine.engineHp,
              yearRange: year.yearRange,
              yearSlug: cleanSlug(year.yearSlug || year.yearRange),
              modelName: model.modelName,
              modelSlug: cleanSlug(model.modelSlug || model.modelName),
              brandName: brand.brandName,
              brandSlug: cleanSlug(brand.brandSlug || brand.brandName),
            }))
          )
        )
      )
      .filter(Boolean);

    res.status(200).json({vehicles: flatVehicles});
  } catch (error) {
    console.error("Sanity fetch error in all-vehicles:", error);
    res.status(500).json({message: "Kunde inte hämta fordonsdata"});
  }
}

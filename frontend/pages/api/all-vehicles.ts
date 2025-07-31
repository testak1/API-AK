// pages/api/all-vehicles.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {groq} from "next-sanity";
import client from "@/lib/sanity";

// Updated query to include all necessary slug fields
const allVehiclesQuery = groq`
*[_type == "brand" && !(_id in path("drafts.**"))] {
  "brandName": name,
  "brandSlug": slug.current,
  "models": models[] {
    "modelName": name,
    "modelSlug": select(
      defined(slug.current) => slug.current,
      defined(slug) => slug.current,
      replace(lower(name), " ", "-")
    ),
    "years": years[] {
      "yearRange": range,
      "yearSlug": select(
        defined(slug) => slug,
        replace(range, " ", "-")
      ),
      "engines": engines[] {
        "engineLabel": label,
        "engineSlug": select(
          defined(slug) => slug,
          replace(lower(label), " ", "-")
        ),
        "engineFuel": fuel,
        "engineHp": stages[0].origHk,
      }
    }
  }
}`;

// Updated type definitions
interface Engine {
  engineLabel: string;
  engineSlug: string;
  engineFuel: string;
  engineHp: number;
}
interface Year {
  yearRange: string;
  yearSlug: string;
  engines: Engine[];
}
interface Model {
  modelName: string;
  modelSlug: string;
  years: Year[];
}
interface BrandResult {
  brandName: string;
  brandSlug: string;
  models: Model[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const nestedVehicles: BrandResult[] = await client.fetch(allVehiclesQuery);

    // Flatten the nested structure and include all slug fields
    const flatVehicles = nestedVehicles
      .flatMap(brand =>
        brand.models?.flatMap(model =>
          model.years?.flatMap(year =>
            year.engines?.map(engine => ({
              engineLabel: engine.engineLabel,
              engineSlug: engine.engineSlug,
              engineFuel: engine.engineFuel,
              engineHp: engine.engineHp,
              yearRange: year.yearRange,
              yearSlug: year.yearSlug,
              modelName: model.modelName,
              modelSlug: model.modelSlug,
              brandName: brand.brandName,
              brandSlug: brand.brandSlug,
            }))
          )
        )
      )
      .filter(Boolean); // Filter out any null/undefined values

    res.status(200).json({vehicles: flatVehicles});
  } catch (error) {
    console.error("Sanity fetch error in all-vehicles:", error);
    res.status(500).json({message: "Kunde inte hämta fordonsdata"});
  }
}

// pages/api/all-vehicles.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {groq} from "next-sanity";
import client from "@/lib/sanity"; // Använder samma klient som dina andra API-filer

// NY, KORREKT FRÅGA: Traverserar den neslade strukturen för att platta ut datan.
const allVehiclesQuery = groq`
*[_type == "brand" && !(_id in path("drafts.**"))] {
  "brandName": name,
  "models": models[] {
    "modelName": name,
    "years": years[] {
      "yearRange": range,
      "engines": engines[] {
        "engineLabel": label,
        "engineFuel": fuel,
        // Tar original-HK från den första definierade stagen
        "engineHp": stages[0].origHk, 
      }
    }
  }
}`;

// Typdefinitioner för att hantera den neslade datan
interface Engine {
  engineLabel: string;
  engineFuel: string;
  engineHp: number;
}
interface Year {
  yearRange: string;
  engines: Engine[];
}
interface Model {
  modelName: string;
  years: Year[];
}
interface BrandResult {
  brandName: string;
  models: Model[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const nestedVehicles: BrandResult[] = await client.fetch(allVehiclesQuery);

    // Plattar ut den neslade datan till den struktur vi behöver
    const flatVehicles = nestedVehicles.flatMap(brand =>
      brand.models.flatMap(model =>
        model.years.flatMap(year =>
          year.engines.map(engine => ({
            ...engine,
            yearRange: year.yearRange,
            modelName: model.modelName,
            brandName: brand.brandName,
          }))
        )
      )
    );

    res.status(200).json({vehicles: flatVehicles});
  } catch (error) {
    console.error("Sanity fetch error in all-vehicles:", error);
    res.status(500).json({message: "Kunde inte hämta fordonsdata"});
  }
}

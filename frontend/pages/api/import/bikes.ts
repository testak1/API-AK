// pages/api/import/bikes.ts
import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {bodyParser: {sizeLimit: "10mb"}},
};

interface BikeImportItem {
  brand: string;
  model: string;
  year: string;
  engine: string;
  type: string;
  vehicleType?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface ImportResult {
  brand: string;
  model: string;
  year: string;
  engine: string;
  status: "created" | "exists" | "error";
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({message: "Endast POST tillåten"});
  }

  try {
    const {items} = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({message: "Tom importlista"});
    }

    const results: ImportResult[] = [];

    for (const item of items) {
      try {
        const result = await processBikeImport(item);
        results.push(result);
      } catch (error: any) {
        results.push({
          brand: item.brand,
          model: item.model,
          year: item.year,
          engine: item.engine,
          status: "error",
          message: error.message,
        });
      }
    }

    const summary = {
      total: results.length,
      created: results.filter(r => r.status === "created").length,
      exists: results.filter(r => r.status === "exists").length,
      errors: results.filter(r => r.status === "error").length,
    };

    res.status(200).json({
      message: "Bike/Quad import klar",
      summary,
      results,
    });
  } catch (err: any) {
    console.error("🔥 Bike/Quad importfel:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

async function processBikeImport(item: BikeImportItem): Promise<ImportResult> {
  const {
    brand,
    model,
    year,
    engine,
    type,
    vehicleType,
    origHk,
    tunedHk,
    origNm,
    tunedNm,
    price,
  } = item;

  // Kolla om Bike/Quad redan finns
  const existingBike = await sanityClient.fetch(
    `*[_type == "bike" && 
      brand->name == $brand && 
      model == $model && 
      year == $year && 
      engine == $engine][0]`,
    {brand, model, year, engine}
  );

  if (existingBike) {
    return {
      brand,
      model,
      year,
      engine,
      status: "exists",
    };
  }

  // Hitta eller skapa bike brand
  let brandDoc = await sanityClient.fetch(
    `*[_type == "bikeBrand" && name == $brand][0]`,
    {brand}
  );

  if (!brandDoc) {
    // Skapa nytt bike brand
    brandDoc = await sanityClient.create({
      _type: "bikeBrand",
      name: brand.trim(),
      slug: {
        _type: "slug",
        current: brand.toLowerCase().replace(/\s+/g, "-"),
      },
      type: vehicleType === "atv" ? "atv" : "motorcycle",
    });
  }

  // Skapa Bike dokument med standardpris 7995 kr
  const bikeDoc = {
    _type: "bike",
    brand: {
      _type: "reference",
      _ref: brandDoc._id,
    },
    model: model.trim(),
    year: year.trim(),
    engine: engine.trim(),
    fuelType: type.toLowerCase() === "electric" ? "electric" : "gasoline",
    vehicleType: vehicleType || "motorcycle",
    origHk: origHk,
    tunedHk: tunedHk,
    origNm: origNm,
    tunedNm: tunedNm,
    price: 7995, // Standardpris 7995 kr
  };

  await sanityClient.create(bikeDoc);

  return {
    brand,
    model,
    year,
    engine,
    status: "created",
  };
}

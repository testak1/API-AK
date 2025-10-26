// jetSkis.ts - Uppdaterad version
import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {bodyParser: {sizeLimit: "10mb"}},
};

interface JetSkiImportItem {
  brand: string;
  model: string;
  year: string;
  engine: string;
  type: string;
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
        const result = await processJetSkiImport(item);
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
      message: "Jet-Ski import klar",
      summary,
      results,
    });
  } catch (err: any) {
    console.error("🔥 Jet-Ski importfel:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

async function processJetSkiImport(
  item: JetSkiImportItem
): Promise<ImportResult> {
  const {
    brand,
    model,
    year,
    engine,
    type,
    origHk,
    tunedHk,
    origNm,
    tunedNm,
    price,
  } = item;

  // Kolla om Jet-Ski redan finns
  const existingJetSki = await sanityClient.fetch(
    `*[_type == "jetSki" && 
      lower(brand) == lower($brand) && 
      lower(model) == lower($model) && 
      year == $year && 
      lower(engine) == lower($engine)][0]`,
    {brand, model, year, engine}
  );

  if (existingJetSki) {
    return {
      brand,
      model,
      year,
      engine,
      status: "exists",
    };
  }

  // Hämta Stage 1 description reference
  const stage1Description = await findStage1Description();

  // Konvertera bränsletyp
  const fuelType = type.toLowerCase() === "electric" ? "electric" : "gasoline";

  // Skapa Jet-Ski dokument med korrekt struktur
  const jetSkiDoc = {
    _type: "jetSki",
    brand: brand.trim(),
    model: model.trim(),
    year: year.trim(),
    engine: engine.trim(),
    fuelType,
    origHk: origHk,
    tunedHk: tunedHk,
    origNm: origNm,
    tunedNm: tunedNm,
    price: convertPriceToSEK(price || 550),
    descriptionRef: stage1Description
      ? {
          _type: "reference",
          _ref: stage1Description._id,
        }
      : undefined,
  };

  await sanityClient.create(jetSkiDoc);

  return {
    brand,
    model,
    year,
    engine,
    status: "created",
  };
}

async function findStage1Description(): Promise<any> {
  const query = `*[_type == "stageDescription" && (stageName match "steg 1" || stageName match "stage 1")][0]{
    _id,
    stageName
  }`;

  const description = await sanityClient.fetch(query);

  if (!description) {
    // Fallback: hitta första stageDescription
    const fallbackQuery = `*[_type == "stageDescription"][0]{_id, stageName}`;
    return await sanityClient.fetch(fallbackQuery);
  }

  return description;
}

function convertPriceToSEK(eurPrice?: number): number {
  if (!eurPrice) return 6325; // Default 550 EUR -> 6325 SEK

  // EUR till SEK konvertering (ungefärlig)
  const exchangeRate = 11.5;
  return Math.round(eurPrice * exchangeRate);
}

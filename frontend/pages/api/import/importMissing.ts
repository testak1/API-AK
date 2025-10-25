import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {bodyParser: {sizeLimit: "10mb"}},
};

interface ImportItem {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  fuel?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface ImportResult {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  status: "created" | "exists" | "error";
  action?: string;
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
        const result = await processImportItem(item);
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
      message: "Import klar",
      summary,
      results,
    });
  } catch (err: any) {
    console.error("🔥 Importfel:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

async function processImportItem(item: ImportItem): Promise<ImportResult> {
  const brandName = item.brand?.trim();
  const modelName = item.model?.trim();
  const yearRange = item.year?.trim();
  const engineLabel = item.engine?.trim();
  const fuelType = item.fuel || "Bensin";

  if (!brandName) {
    throw new Error("Brand name saknas");
  }

  // Hämta Stage 1 description reference
  const stage1Description = await findStage1Description();
  if (!stage1Description) {
    throw new Error("Kunde inte hitta Stage 1 description");
  }

  // Hämta hela brand-dokumentet med alla modeller, years och engines
  const brandDoc = await sanityClient.fetch(
    `*[_type == "brand" && lower(name) == lower($name)][0]{
      _id,
      name,
      models
    }`,
    {name: brandName}
  );

  if (!brandDoc?._id) {
    throw new Error(`Brand '${brandName}' hittades inte`);
  }

  // Skapa stage objekt med fast pris och description
  const stage = {
    _key: generateKey(),
    name: "Steg 1",
    type: "performance",
    origHk: item.origHk,
    tunedHk: item.tunedHk,
    origNm: item.origNm,
    tunedNm: item.tunedNm,
    price: 4995, // Fast pris för Steg 1
    descriptionRef: {
      _type: "reference",
      _ref: stage1Description._id,
    },
  };

  // Skapa engine objekt
  const newEngine = {
    _key: generateKey(),
    fuel: fuelType,
    label: engineLabel,
    stages: [stage],
  };

  let action = "";
  let patch = sanityClient.patch(brandDoc._id);

  // Hitta eller skapa model
  const modelIndex = brandDoc.models?.findIndex(
    (m: any) => normalizeString(m?.name) === normalizeString(modelName)
  );

  if (modelIndex === -1 || !brandDoc.models?.[modelIndex]) {
    // Skapa ny model med year och engine
    patch = patch.append("models", [
      {
        _key: generateKey(),
        name: modelName,
        years: [
          {
            _key: generateKey(),
            range: yearRange,
            engines: [newEngine],
          },
        ],
      },
    ]);
    action = "new_model";
  } else {
    // Model finns, hitta eller skapa year med BÄTTRE jämförelse
    const model = brandDoc.models[modelIndex];
    const yearIndex = model.years?.findIndex((y: any) =>
      compareYearRanges(y?.range, yearRange)
    );

    if (yearIndex === -1 || !model.years?.[yearIndex]) {
      // Skapa ny year i befintlig model
      patch = patch.append(`models[${modelIndex}].years`, [
        {
          _key: generateKey(),
          range: yearRange,
          engines: [newEngine],
        },
      ]);
      action = "new_year";
    } else {
      // Year finns, kolla om engine redan finns
      const year = model.years[yearIndex];
      const engineExists = year.engines?.some(
        (e: any) => normalizeString(e?.label) === normalizeString(engineLabel)
      );

      if (engineExists) {
        return {
          brand: brandName,
          model: modelName,
          year: yearRange,
          engine: engineLabel,
          status: "exists",
          action: "engine_exists",
        };
      } else {
        // Lägg till engine i befintlig year
        patch = patch.append(
          `models[${modelIndex}].years[${yearIndex}].engines`,
          [newEngine]
        );
        action = "new_engine";
      }
    }
  }

  // Utför patch
  await patch.commit();

  return {
    brand: brandName,
    model: modelName,
    year: yearRange,
    engine: engineLabel,
    status: "created",
    action,
  };
}

// Hjälpfunktion för att hitta Stage 1 description
async function findStage1Description(): Promise<any> {
  const query = `*[_type == "stageDescription" && stageName match "steg 1" || stageName match "stage 1"][0]{
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

// Bättre jämförelse av år-intervall
function compareYearRanges(range1: string, range2: string): boolean {
  if (!range1 || !range2) return false;

  const normalizeYearRange = (range: string): string => {
    return range
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[→–-]/g, "-") // Normalisera alla separatorer till -
      .replace(/\.\.\./g, "") // Ta bort ...
      .replace(/\//g, "-") // Ersätt / med -
      .trim();
  };

  return normalizeYearRange(range1) === normalizeYearRange(range2);
}

// Bättre normalisering för strängjämförelse
function normalizeString(text = ""): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9åäö]/g, "")
    .trim();
}

function generateKey(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

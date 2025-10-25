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

  // Skapa stage objekt
  const stage = {
    _key: generateKey(),
    name: "Steg 1",
    type: "performance",
    origHk: item.origHk,
    tunedHk: item.tunedHk,
    origNm: item.origNm,
    tunedNm: item.tunedNm,
    price: item.price,
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
    (m: any) => m?.name?.toLowerCase() === modelName?.toLowerCase()
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
    // Model finns, hitta eller skapa year
    const model = brandDoc.models[modelIndex];
    const yearIndex = model.years?.findIndex(
      (y: any) => y?.range?.toLowerCase() === yearRange?.toLowerCase()
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
        (e: any) => e?.label?.toLowerCase() === engineLabel?.toLowerCase()
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

function generateKey(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

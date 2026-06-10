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
  stages?: ImportStage[];
}

interface ImportStage {
  name?: string;
  type?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
  sourcePrice?: number | string;
  sourceUrl?: string;
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
    const historySaved = await saveImportHistory(items, results, summary);

    res.status(200).json({
      message: "Import klar",
      summary,
      results,
      historySaved,
    });
  } catch (err: any) {
    console.error("🔥 Importfel:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

async function saveImportHistory(
  items: ImportItem[],
  results: ImportResult[],
  summary: {total: number; created: number; exists: number; errors: number}
) {
  try {
    const importedAt = new Date().toISOString();

    await sanityClient.create({
      _type: "importHistory",
      importedAt,
      source: "admin-import",
      summary,
      entries: items.map((item, index) => {
        const result = results[index];

        return {
          _key: generateKey(),
          importedAt,
          brand: item.brand,
          model: item.model,
          year: item.year,
          engine: item.engine,
          stages: getImportStages(item).map(stage =>
            normalizeStageName(stage.name)
          ),
          status: result?.status || "error",
          action: result?.action,
          message: result?.message,
        };
      }),
    });

    return true;
  } catch (error) {
    console.error("Kunde inte spara importhistorik:", error);
    return false;
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

  const stages = await buildStages(item);
  if (!stages.length) {
    throw new Error("Stage-data saknas");
  }

  // Skapa engine objekt
  const newEngine = {
    _key: generateKey(),
    fuel: fuelType,
    label: engineLabel,
    stages,
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
      const engineIndex = year.engines?.findIndex(
        (e: any) => normalizeString(e?.label) === normalizeString(engineLabel)
      );

      if (
        typeof engineIndex === "number" &&
        engineIndex > -1 &&
        year.engines?.[engineIndex]
      ) {
        const existingEngine = year.engines[engineIndex];
        const existingStageNames = new Set(
          (existingEngine.stages || []).map((stage: any) =>
            normalizeString(stage?.name)
          )
        );
        const stagesToAdd = stages.filter(
          stage => !existingStageNames.has(normalizeString(stage.name))
        );

        if (!stagesToAdd.length) {
          return {
            brand: brandName,
            model: modelName,
            year: yearRange,
            engine: engineLabel,
            status: "exists",
            action: "engine_exists",
          };
        }

        patch = patch.append(
          `models[${modelIndex}].years[${yearIndex}].engines[${engineIndex}].stages`,
          stagesToAdd
        );
        action = "new_stages";
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

async function buildStages(item: ImportItem) {
  const importStages = getImportStages(item);
  const stages = await Promise.all(
    importStages.map(async stage => {
      const stageName = normalizeStageName(stage.name);
      const type = normalizeStageType(stage);
      const description = await findStageDescription(stageName);
      const baseStage: any = {
        _key: generateKey(),
        name: stageName,
        type,
        price:
          typeof stage.price === "number"
            ? stage.price
            : defaultStagePrice(stageName),
      };

      if (type === "performance") {
        baseStage.origHk = stage.origHk;
        baseStage.tunedHk = stage.tunedHk;
        baseStage.origNm = stage.origNm;
        baseStage.tunedNm = stage.tunedNm;
      }

      if (description?._id) {
        baseStage.descriptionRef = {
          _type: "reference",
          _ref: description._id,
        };
      }

      return baseStage;
    })
  );

  return stages.filter(stage => stage.name);
}

function getImportStages(item: ImportItem): ImportStage[] {
  if (Array.isArray(item.stages) && item.stages.length > 0) {
    return item.stages;
  }

  if (
    item.origHk ||
    item.tunedHk ||
    item.origNm ||
    item.tunedNm ||
    item.price
  ) {
    return [
      {
        name: "Steg 1",
        type: "performance",
        origHk: item.origHk,
        tunedHk: item.tunedHk,
        origNm: item.origNm,
        tunedNm: item.tunedNm,
        price: 4995,
      },
    ];
  }

  return [];
}

function normalizeStageName(stageName = "Steg 1"): string {
  const value = stageName.trim();
  const key = normalizeString(value);

  if (key === "stage1" || key === "steg1") return "Steg 1";
  if (key === "stage2" || key === "steg2") return "Steg 2";
  if (key === "stage3" || key === "steg3") return "Steg 3";
  if (key === "stage4" || key === "steg4") return "Steg 4";
  if (["gearbox", "dsg", "tcu"].includes(key) || key.startsWith("dsg")) {
    return "DSG";
  }

  return value || "Steg 1";
}

function normalizeStageType(stage: ImportStage): string {
  const key = normalizeString(stage.name || "");
  if (
    stage.type === "tcu" ||
    ["gearbox", "dsg", "tcu"].includes(key) ||
    key.startsWith("dsg")
  ) {
    return "tcu";
  }

  return "performance";
}

function defaultStagePrice(stageName: string): number {
  const key = normalizeString(stageName);

  if (key === "steg1" || key === "stage1") return 4995;
  if (key === "steg2" || key === "stage2") return 9995;
  if (["gearbox", "dsg", "tcu"].includes(key) || key.startsWith("dsg")) {
    return 3495;
  }

  return 0;
}

const stageDescriptionCache = new Map<string, Promise<any>>();

async function findStageDescription(stageName: string): Promise<any> {
  const normalizedName = normalizeStageName(stageName);
  const cacheKey = normalizeString(normalizedName);

  if (stageDescriptionCache.has(cacheKey)) {
    return stageDescriptionCache.get(cacheKey);
  }

  const englishName = normalizedName.replace(/^Steg/i, "Stage");
  const query = `*[_type == "stageDescription" && (
    lower(stageName) == lower($stageName) ||
    lower(stageName) == lower($englishName) ||
    stageName match $stageName ||
    stageName match $englishName
  )][0]{
    _id,
    stageName
  }`;

  const promise = sanityClient
    .fetch(query, {stageName: normalizedName, englishName})
    .then(async description => {
      if (description) return description;

      if (cacheKey === "dsg") {
        return null;
      }

      const fallbackQuery = `*[_type == "stageDescription" && (
        stageName match "steg 1" || stageName match "stage 1"
      )][0]{_id, stageName}`;
      return sanityClient.fetch(fallbackQuery);
    });

  stageDescriptionCache.set(cacheKey, promise);
  return promise;
}

// Bättre jämförelse av år-intervall
function compareYearRanges(range1: string, range2: string): boolean {
  if (!range1 || !range2) return false;

  const normalizeYearRange = (range: string): string => {
    return range
      .toLowerCase()
      .replace(/[→⇒➡]/g, "->")
      .replace(/[‐‑‒–—−]/g, "-")
      .replace(/\.\.\./g, "")
      .replace(/->/g, " ")
      .replace(/\//g, " ")
      .replace(/[^a-z0-9åäö]+/g, "")
      .trim();
  };

  if (normalizeYearRange(range1) === normalizeYearRange(range2)) return true;

  const yearSignature = (range: string) => {
    const normalized = range.toLowerCase().trim();
    const years = normalized.match(/(?:19|20)\d{2}/g) || [];
    const prefix = normalized.match(/^\s*([a-z0-9]+)/)?.[1] || "";
    return {prefix, years};
  };

  const a = yearSignature(range1);
  const b = yearSignature(range2);

  if (!a.prefix || a.prefix !== b.prefix || !a.years.length || !b.years.length) {
    return false;
  }

  if (a.years.join("|") === b.years.join("|")) return true;

  return (
    a.years.length === 1 &&
    b.years.length === 1 &&
    a.years[0] === b.years[0]
  );
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

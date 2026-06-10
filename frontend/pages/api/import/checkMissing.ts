import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {bodyParser: {sizeLimit: "15mb"}},
};

interface ImportStage {
  name?: string;
}

interface ImportItem {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  stages?: ImportStage[];
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
}

interface ItemMatchStatus {
  id: string;
  status:
    | "exists"
    | "missing_stages"
    | "new_engine"
    | "new_year"
    | "new_model"
    | "missing_brand";
  brandExists: boolean;
  modelExists: boolean;
  yearExists: boolean;
  engineExists: boolean;
  matchedYear?: string;
  existingStages: string[];
  missingStages: string[];
  message: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({message: "Endast POST tillåten"});
  }

  const {items} = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({message: "Tom importlista"});
  }

  const brands = await sanityClient.fetch(
    `*[_type == "brand"]{
      _id,
      name,
      models[]{
        name,
        years[]{
          range,
          engines[]{
            label,
            stages[]{name}
          }
        }
      }
    }`
  );

  const results = items.map((item: ImportItem) => matchItem(item, brands));
  const summary = {
    total: results.length,
    exists: results.filter(item => item.status === "exists").length,
    missingStages: results.filter(item => item.status === "missing_stages")
      .length,
    newEngines: results.filter(item => item.status === "new_engine").length,
    newYears: results.filter(item => item.status === "new_year").length,
    newModels: results.filter(item => item.status === "new_model").length,
    missingBrands: results.filter(item => item.status === "missing_brand")
      .length,
  };

  return res.status(200).json({results, summary});
}

function matchItem(item: ImportItem, brands: any[]): ItemMatchStatus {
  const id = getEngineId(item);
  const brand = brands.find(
    brandDoc => normalizeString(brandDoc?.name) === normalizeString(item.brand)
  );

  if (!brand) {
    return baseStatus(item, id, "missing_brand", "Märket saknas i Sanity");
  }

  const model = (brand.models || []).find(
    (modelDoc: any) =>
      modelCompareKey(modelDoc?.name) === modelCompareKey(item.model)
  );

  if (!model) {
    return {
      ...baseStatus(item, id, "new_model", "Modellen saknas i Sanity"),
      brandExists: true,
    };
  }

  const year = (model.years || []).find((yearDoc: any) =>
    compareYearRanges(yearDoc?.range, item.year)
  );

  if (!year) {
    return {
      ...baseStatus(item, id, "new_year", "Årsmodellen saknas i Sanity"),
      brandExists: true,
      modelExists: true,
    };
  }

  const engine = (year.engines || []).find(
    (engineDoc: any) =>
      normalizeString(engineDoc?.label) === normalizeString(item.engine)
  );

  if (!engine) {
    return {
      ...baseStatus(item, id, "new_engine", "Motorn saknas i Sanity"),
      brandExists: true,
      modelExists: true,
      yearExists: true,
      matchedYear: year.range,
    };
  }

  const existingStages = (engine.stages || [])
    .map((stage: any) => normalizeStageName(stage?.name))
    .filter(Boolean);
  const existingStageKeys = new Set(existingStages.map(normalizeString));
  const missingStages = getImportStages(item)
    .map(stage => normalizeStageName(stage.name))
    .filter(stageName => !existingStageKeys.has(normalizeString(stageName)));

  if (missingStages.length > 0) {
    return {
      id,
      status: "missing_stages",
      brandExists: true,
      modelExists: true,
      yearExists: true,
      engineExists: true,
      matchedYear: year.range,
      existingStages,
      missingStages,
      message: `Motorn finns, saknar ${missingStages.join(", ")}`,
    };
  }

  return {
    id,
    status: "exists",
    brandExists: true,
    modelExists: true,
    yearExists: true,
    engineExists: true,
    matchedYear: year.range,
    existingStages,
    missingStages: [],
    message: "Finns redan i Sanity",
  };
}

function baseStatus(
  item: ImportItem,
  id: string,
  status: ItemMatchStatus["status"],
  message: string
): ItemMatchStatus {
  return {
    id,
    status,
    brandExists: false,
    modelExists: false,
    yearExists: false,
    engineExists: false,
    existingStages: [],
    missingStages: getImportStages(item).map(stage =>
      normalizeStageName(stage.name)
    ),
    message,
  };
}

function getImportStages(item: ImportItem): ImportStage[] {
  if (Array.isArray(item.stages) && item.stages.length > 0) {
    return item.stages;
  }

  if (item.origHk || item.tunedHk || item.origNm || item.tunedNm) {
    return [{name: "Steg 1"}];
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

function compareYearRanges(range1?: string, range2?: string): boolean {
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

function normalizeString(text = ""): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9åäö]/g, "")
    .trim();
}

function modelCompareKey(text = ""): string {
  let key = normalizeString(text);

  key = key.replace(/^serie(\d)/, "$1serien");
  key = key.replace(/(\d)serie(n)?/, "$1serien");

  const aliases: Record<string, string> = {
    serie1: "1serien",
    serie2: "2serien",
    serie3: "3serien",
    serie4: "4serien",
    serie5: "5serien",
    serie6: "6serien",
    serie7: "7serien",
    serie8: "8serien",
    serie2gc: "2seriengrancoupe",
    serie2grancoupe: "2seriengrancoupe",
    serie2grandcoupe: "2seriengrancoupe",
    "2seriengc": "2seriengrancoupe",
    "2seriengrancoupe": "2seriengrancoupe",
    "2seriengrandcoupe": "2seriengrancoupe",
    serie2activegran: "2seriengrandactivetourer",
    serie2activegrantourer: "2seriengrandactivetourer",
    serie2grandactivetourer: "2seriengrandactivetourer",
    serie2granactivetourer: "2seriengrandactivetourer",
    "2serienactivegran": "2seriengrandactivetourer",
    "2serienactivegrantourer": "2seriengrandactivetourer",
    "2seriengranactivetourer": "2seriengrandactivetourer",
    "4seriengc": "4seriengrancoupe",
    serie4gc: "4seriengrancoupe",
    serie4grancoupe: "4seriengrancoupe",
    serie4grandcoupe: "4seriengrancoupe",
    "4seriengrancoupe": "4seriengrancoupe",
    "4seriengrandcoupe": "4seriengrancoupe",
  };

  return aliases[key] || key;
}

function getEngineId(item: ImportItem): string {
  return `${item.brand}-${item.model}-${item.year}-${item.engine}`
    .replace(/\s+/g, "_")
    .toLowerCase();
}

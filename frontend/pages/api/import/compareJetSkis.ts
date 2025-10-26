import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

function normalizeString(text = ""): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9åäö]/g, "")
    .trim();
}

function compareYearRanges(range1: string, range2: string): boolean {
  if (!range1 || !range2) return false;

  const normalizeYearRange = (range: string): string => {
    return range
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[→–-]/g, "-")
      .replace(/\.\.\./g, "")
      .replace(/\//g, "-")
      .trim();
  };

  return normalizeYearRange(range1) === normalizeYearRange(range2);
}

interface JetSkiData {
  [brand: string]: {
    models: {
      [model: string]: {
        years: {
          [year: string]: {
            engines: {
              [engine: string]: {
                type: string;
                stages: {
                  [stageName: string]: {
                    origHk?: number;
                    tunedHk?: number;
                    origNm?: number;
                    tunedNm?: number;
                    price?: number;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}

interface MissingJetSki {
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
  data: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {jetSkiData}: {jetSkiData: JetSkiData} = req.body;

    if (!jetSkiData) {
      return res.status(400).json({error: "Missing Jet-Ski JSON data"});
    }

    // Hämta alla befintliga Jet-Skis från Sanity
    const existingJetSkis = await sanityClient.fetch(`
      *[_type == "jetSki"]{
        brand,
        model,
        year,
        engine
      }
    `);

    const missing: MissingJetSki[] = [];

    // Iterera genom Jet-Ski data och jämför med Sanity
    for (const [brandName, brandData] of Object.entries(jetSkiData)) {
      if (!brandData?.models) continue;

      for (const [modelName, modelData] of Object.entries(brandData.models)) {
        if (!modelData?.years) continue;

        for (const [yearName, yearData] of Object.entries(modelData.years)) {
          if (!yearData?.engines) continue;

          for (const [engineName, engineData] of Object.entries(
            yearData.engines
          )) {
            // Kolla om denna Jet-Ski redan finns
            const exists = existingJetSkis.some(
              (existing: any) =>
                normalizeString(existing.brand) ===
                  normalizeString(brandName) &&
                normalizeString(existing.model) ===
                  normalizeString(modelName) &&
                compareYearRanges(existing.year, yearName) &&
                normalizeString(existing.engine) === normalizeString(engineName)
            );

            if (!exists) {
              const stage1 =
                engineData.stages["Stage 1"] ||
                Object.values(engineData.stages)[0];

              missing.push({
                brand: brandName,
                model: modelName,
                year: yearName,
                engine: engineName,
                type: engineData.type,
                origHk: stage1?.origHk,
                tunedHk: stage1?.tunedHk,
                origNm: stage1?.origNm,
                tunedNm: stage1?.tunedNm,
                price: stage1?.price,
                data: engineData,
              });
            }
          }
        }
      }
    }

    res.json({
      missing,
      summary: {
        totalMissing: missing.length,
        brands: [...new Set(missing.map(m => m.brand))].length,
        models: [...new Set(missing.map(m => `${m.brand}-${m.model}`))].length,
      },
    });
  } catch (error: any) {
    console.error("Jet-Ski compare error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

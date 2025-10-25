import {NextApiRequest, NextApiResponse} from "next";
import {getAllData} from "@/lib/sanityImport";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "15mb",
    },
  },
};

function normalize(text = ""): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

interface BRData {
  [brand: string]: {
    models: {
      [model: string]: {
        years: {
          [year: string]: {
            engines: {
              [engine: string]: {
                type?: string;
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
}

interface MissingItem {
  brand: string;
  model: string;
  year: string;
  engine: string;
  fuel: string;
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
    const {brData}: {brData: BRData} = req.body;

    if (!brData) {
      return res.status(400).json({error: "Missing BR JSON data"});
    }

    const sanityData = await getAllData();
    const missing: MissingItem[] = [];

    // Iterera genom BR-data och jämför med Sanity
    for (const [brandName, brandData] of Object.entries(brData)) {
      if (!brandData?.models) continue;

      const sanityBrand = sanityData.find(
        (b: any) => normalize(b.name) === normalize(brandName)
      );

      if (!sanityBrand) {
        console.log(`Brand not found in Sanity: ${brandName}`);
        continue;
      }

      for (const [modelName, modelData] of Object.entries(brandData.models)) {
        if (!modelData?.years) continue;

        const sanityModel = sanityBrand.models?.find(
          (m: any) => normalize(m.name) === normalize(modelName)
        );

        if (!sanityModel) {
          console.log(`Model not found: ${brandName} -> ${modelName}`);
          continue;
        }

        for (const [yearName, yearData] of Object.entries(modelData.years)) {
          if (!yearData?.engines) continue;

          const sanityYear = sanityModel.years?.find(
            (y: any) => normalize(y.range) === normalize(yearName)
          );

          if (!sanityYear) {
            console.log(
              `Year not found: ${brandName} -> ${modelName} -> ${yearName}`
            );
            continue;
          }

          for (const [engineName, engineData] of Object.entries(
            yearData.engines
          )) {
            const engineExists = sanityYear.engines?.some(
              (e: any) =>
                normalize(e.label).includes(normalize(engineName)) ||
                normalize(engineName).includes(normalize(e.label))
            );

            if (!engineExists) {
              missing.push({
                brand: brandName,
                model: modelName,
                year: yearName,
                engine: engineName,
                fuel: engineData.type || "Bensin",
                origHk: engineData.origHk,
                tunedHk: engineData.tunedHk,
                origNm: engineData.origNm,
                tunedNm: engineData.tunedNm,
                price: engineData.price,
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
    console.error("Compare error:", error);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
}

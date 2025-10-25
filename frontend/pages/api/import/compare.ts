import {NextApiRequest, NextApiResponse} from "next";
import {getAllData} from "@/lib/sanityImport";

function normalize(text = "") {
  return text.toLowerCase().replace(/\s|[^a-z0-9]/g, "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") return res.status(405).end();

  const {brData} = req.body;
  if (!brData) return res.status(400).json({error: "Missing BR JSON"});

  const sanityData = await getAllData();

  const missing: any[] = [];

  for (const [brandName, brandData] of Object.entries(brData)) {
    const sanityBrand = sanityData.find(
      (b: any) => normalize(b.name) === normalize(brandName)
    );
    if (!sanityBrand) continue;

    for (const [modelName, modelData] of Object.entries(
      (brandData as any).models
    )) {
      const sanityModel = sanityBrand.models.find(
        (m: any) => normalize(m.name) === normalize(modelName)
      );
      if (!sanityModel) continue;

      for (const [yearName, yearData] of Object.entries(
        (modelData as any).years
      )) {
        const sanityYear = sanityModel.years.find(
          (y: any) => normalize(y.range) === normalize(yearName)
        );
        if (!sanityYear) continue;

        for (const [engineName, engineObj] of Object.entries(
          (yearData as any).engines
        ) as [string, any][]) {
          const exists = sanityYear.engines.some((e: any) =>
            normalize(e.label).includes(normalize(engineName))
          );
          if (!exists) {
            missing.push({
              brand: brandName,
              model: modelName,
              year: yearName,
              engine: engineName,
              fuel: (engineObj as any).type,
              data: engineObj as any,
            });
          }
        }
      }
    }
  }

  res.json({missing});
}

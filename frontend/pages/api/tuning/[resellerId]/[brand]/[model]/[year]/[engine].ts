import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { engineByParamsQuery, resellerOverrideQuery } from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { resellerId, brand, model, year, engine } = req.query;

  if (!resellerId || !brand || !model || !year || !engine) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: (brand as string).toLowerCase(),
    });

    const override = await client.fetch(resellerOverrideQuery, {
      resellerId,
      brand,
      model,
      year,
      engine,
    });

    // Hitta rätt motor
    const modelData = brandData.models.find((m) => m.slug.current === model);
    const yearData = modelData?.years.find((y) => y.slug === year);
    const engineData = yearData?.engines.find((e) => e.slug === engine);

    if (!engineData) return res.status(404).json({ error: "Engine not found" });

    // Om override finns, slå samman
    const finalStages = engineData.stages.map((stage) => {
      const overrideStage = override?.stages?.find(
        (s) => s.name === stage.name,
      );
      return {
        ...stage,
        ...overrideStage,
      };
    });

    const finalData = {
      ...engineData,
      logo: override?.logo || brandData.logo,
      aktplusVisible: override?.aktplusVisible ?? true,
      stages: finalStages,
    };

    return res.status(200).json({ engine: finalData });
  } catch (err) {
    console.error("API fetch failed:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

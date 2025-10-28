// pages/api/bike-engines.ts
import {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";
import {bikeEnginesQuery} from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {brand, model, year, lang = "sv"} = req.query;

  if (!brand || !model || !year) {
    return res.status(400).json({error: "Missing parameters"});
  }

  try {
    const result = await client.fetch(bikeEnginesQuery, {
      brand,
      model,
      year,
      lang,
    });

    const engines = result.map((engine: any) => ({
      _id: engine._id,
      label: engine.engine,
      fuel: engine.fuelType === "electric" ? "Electric" : "Bensin",
      vehicleType: engine.vehicleType,
      slug: engine.engine,
      stages: [
        {
          name: "Steg 1",
          type: "performance",
          origHk: engine.origHk,
          tunedHk: engine.tunedHk,
          origNm: engine.origNm,
          tunedNm: engine.tunedNm,
          price: engine.price,
          description: engine.descriptionRef?.description || [],
          descriptionRef: engine.descriptionRef,
        },
      ],
    }));

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=21600, stale-while-revalidate=900"
    );
    res.setHeader("Vary", "Accept-Encoding, Accept-Language");

    res.status(200).json({result: engines});
  } catch (error) {
    console.error("Error in /api/bike-engines:", error);
    res.status(500).json({error: "Failed to load bike engines"});
  }
}

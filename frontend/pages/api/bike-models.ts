// pages/api/bike-models.ts
import {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";
import {bikeModelsQuery} from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {brand} = req.query;

  if (!brand) {
    return res.status(400).json({error: "Missing brand parameter"});
  }

  try {
    const result = await client.fetch(bikeModelsQuery, {brand});

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=21600, stale-while-revalidate=900"
    );
    res.setHeader("Vary", "Accept-Encoding");

    res.status(200).json({result: result?.models || []});
  } catch (error) {
    console.error("Error in /api/bike-models:", error);
    res.status(500).json({error: "Failed to load bike models"});
  }
}

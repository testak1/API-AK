// pages/api/bike-years.ts
import {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";
import {bikeYearsQuery} from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const {brand, model} = req.query;

  if (!brand || !model) {
    return res.status(400).json({error: "Missing brand or model parameter"});
  }

  try {
    const result = await client.fetch(bikeYearsQuery, {brand, model});

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=21600, stale-while-revalidate=900"
    );
    res.setHeader("Vary", "Accept-Encoding");

    const years = result?.years?.map((y: any) => ({range: y.year})) || [];
    res.status(200).json({result: years});
  } catch (error) {
    console.error("Error in /api/bike-years:", error);
    res.status(500).json({error: "Failed to load bike years"});
  }
}

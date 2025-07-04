// pages/api/years.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { brand, model } = req.query;
  if (!brand || !model)
    return res.status(400).json({ error: "Missing brand or model" });

  try {
    const query = `*[_type == "brand" && name == $brand][0]
      .models[name == $model][0]
      .years[]{
        range,
        "slug": range
      }`;

    const result = await client.fetch(query, { brand, model });

    // Cache for 6 hours with revalidation
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=21600, stale-while-revalidate=900",
    );
    res.setHeader("Vary", "Accept-Encoding, Brand, Model");

    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: "Failed to load years" });
  }
}

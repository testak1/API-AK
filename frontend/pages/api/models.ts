// pages/api/models.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { brand } = req.query;
  if (!brand || typeof brand !== "string")
    return res.status(400).json({ error: "Missing brand" });

  try {
    const query = `*[_type == "brand" && name == $brand][0].models[]{
      name,
      "slug": slug.current
    }`;

    const result = await client.fetch(query, { brand });

    // Cache for 12 hours with revalidation
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=43200, stale-while-revalidate=1800",
    );
    res.setHeader("Vary", "Accept-Encoding, Brand");

    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: "Failed to load models" });
  }
}

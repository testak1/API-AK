// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { brandsLightQuery } from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const result = await client.fetch(brandsLightQuery);
    if (!Array.isArray(result)) throw new Error("Invalid Sanity response");

    // Cache for 24 hours (86400 seconds) with revalidation
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=3600",
    );
    res.setHeader("Vary", "Accept-Encoding");

    res.status(200).json({ result });
  } catch (error) {
    console.error("Error in /api/brands:", error);
    res.status(500).json({ error: "Failed to load brands" });
  }
}

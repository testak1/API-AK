// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { brandsLightQuery } from "@/src/lib/queries";

let cachedData: any = null;
let lastFetch = 0;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const now = Date.now();

    if (cachedData && now - lastFetch < CACHE_TTL) {
      return res.status(200).json({ result: cachedData });
    }

    const result = await client.fetch(brandsLightQuery);
    if (!Array.isArray(result)) throw new Error("Invalid Sanity response");

    cachedData = result;
    lastFetch = now;

    res.status(200).json({ result });
  } catch (error) {
    console.error("Error in /api/brands:", error);
    res.status(500).json({ error: "Failed to load brands" });
  }
}

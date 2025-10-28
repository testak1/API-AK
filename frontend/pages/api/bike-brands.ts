// pages/api/bike-brands.ts
import {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";
import {bikeBrandsQuery} from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const result = await client.fetch(bikeBrandsQuery);

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=86400, stale-while-revalidate=3600"
    );
    res.setHeader("Vary", "Accept-Encoding");

    res.status(200).json({result});
  } catch (error) {
    console.error("Error in /api/bike-brands:", error);
    res.status(500).json({error: "Failed to load bike brands"});
  }
}

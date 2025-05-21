// pages/api/overrides.ts
import type { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { groq } from "next-sanity";

const query = groq`
  *[_type == "resellerOverride" && resellerId == $resellerId] {
    _id,
    brand,
    model,
    year,
    engine,
    logo,
    overridePrice,
    overrideHp,
    overrideNm,
    showAktPlus
  }
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const resellerId = req.query.resellerId as string;

  if (!resellerId) {
    return res.status(400).json({ error: "Missing resellerId" });
  }

  try {
    const overrides = await client.fetch(query, { resellerId });
    res.status(200).json({ overrides });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch overrides" });
  }
}

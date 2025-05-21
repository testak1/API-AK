// pages/api/overrides/[resellerId]/[engineId].ts
import { groq } from "next-sanity";
import type { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { resellerOverridesForEngineQuery } from "@/src/lib/queries";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { resellerId, engineId } = req.query;

  if (!resellerId || !engineId) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const overrides = await client.fetch(resellerOverridesForEngineQuery, {
    resellerId,
    engineId,
  });

  res.status(200).json({ overrides });
}

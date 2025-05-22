// pages/api/reseller-logo.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { resellerId } = req.query;

  if (!resellerId || typeof resellerId !== "string") {
    return res.status(400).json({ error: "Missing resellerId" });
  }

  try {
    const data = await client.fetch(
      `*[_type == "resellerOverride" && resellerId == $resellerId][0]{
        logo { asset->{url} }
      }`,
      { resellerId },
    );

    if (!data?.logo?.asset?.url) {
      return res.status(404).json({ error: "Reseller not found or no logo" });
    }

    return res.status(200).json({ logoUrl: data.logo.asset.url });
  } catch (error) {
    console.error("Error fetching reseller logo:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

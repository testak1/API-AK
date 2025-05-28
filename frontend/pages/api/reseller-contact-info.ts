import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { resellerId } = req.query;

  try {
    const reseller = await client.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{
        contactInfo
      }`,
      { resellerId },
    );

    if (!reseller) {
      return res.status(404).json({ error: "Reseller not found" });
    }

    return res.status(200).json({
      contactInfo: reseller.contactInfo || "",
    });
  } catch (error) {
    console.error("Error fetching reseller contact info:", error);
    return res.status(500).json({ error: "Failed to fetch contact info" });
  }
}

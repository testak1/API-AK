import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { contactInfo } = req.body;

  try {
    await client
      .patch(`resellerUser.${req.headers["reseller-id"]}`)
      .set({ contactInfo })
      .commit();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating contact info:", error);
    return res.status(500).json({ error: "Failed to update contact info" });
  }
}

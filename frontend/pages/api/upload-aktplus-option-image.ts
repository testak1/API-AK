import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb",
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;
  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { imageData, contentType } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: "Missing imageData" });
    }

    const buffer = Buffer.from(imageData, "base64");

    const asset = await client.assets.upload("image", buffer, {
      filename: `aktplus-option-${resellerId}-${Date.now()}.png`,
      contentType: contentType || "image/png",
    });

    return res.status(200).json({
      success: true,
      assetId: asset._id,
      url: urlFor(asset).url(), // ✅ FIXED: use correct `asset`
    });
  } catch (error) {
    console.error("Image upload failed:", error);
    return res.status(500).json({ error: "Image upload failed" });
  }
}

import type { NextApiRequest, NextApiResponse } from "next";
import client, { urlFor } from "@/lib/sanity";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "6mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { imageData, filename } = req.body as {
    imageData?: string;
    filename?: string;
  };

  if (!imageData || !filename) {
    return res.status(400).json({ error: "Missing image data or filename" });
  }

  try {
    const buffer = Buffer.from(imageData, "base64");
    const asset = await client.assets.upload("image", buffer, {
      filename,
      contentType: "image/png",
    });

    return res.status(200).json({
      url: urlFor(asset).url(),
      assetId: asset._id,
    });
  } catch (error) {
    console.error("Model image upload failed:", error);
    return res.status(500).json({ error: "Image upload failed" });
  }
}

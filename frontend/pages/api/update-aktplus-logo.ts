import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "5mb", // för större bilder
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

    // Konvertera base64 till buffer
    const buffer = Buffer.from(imageData, "base64");

    const imageAsset = await client.assets.upload("image", buffer, {
      filename: `aktplus-logo-${resellerId}`,
      contentType: contentType || "image/png",
    });

    const user = await client.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{ _id }`,
      { resellerId },
    );

    if (!user?._id) {
      return res.status(404).json({ error: "Reseller not found" });
    }

    await client
      .patch(user._id)
      .set({
        aktPlusLogo: {
          _type: "image",
          asset: { _type: "reference", _ref: imageAsset._id },
        },
      })
      .commit();

    return res.status(200).json({
      success: true,
      aktPlusLogoUrl: urlFor({ _ref: imageAsset._id }).url(),
    });
  } catch (error) {
    console.error("Error updating AKTPLUS logo:", error);
    return res.status(500).json({ error: "Failed to update logo" });
  }
}

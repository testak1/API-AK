// pages/api/update-aktplus-logo.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import client from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";

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
    // Fetch the document ID
    const user = await client.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{ _id }`,
      { resellerId },
    );

    if (!user?._id) {
      return res.status(404).json({ error: "Reseller not found" });
    }

    // Create the image asset in Sanity
    const imageAsset = await client.assets.upload("image", req.body.imageData, {
      filename: `aktplus-logo-${resellerId}`,
      contentType: "image/png", // or 'image/jpeg' depending on your needs
    });

    // Update the document with the image reference
    await client
      .patch(user._id)
      .set({
        aktPlusLogo: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: imageAsset._id,
          },
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

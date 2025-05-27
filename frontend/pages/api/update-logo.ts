// pages/api/update-logo.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { uploadImageToSanity } from "@/lib/sanity"; // You'll need to implement this

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const { imageData } = req.body;

    // Upload image to Sanity
    const imageAsset = await uploadImageToSanity(imageData);

    // Get the document ID
    const userDoc = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]._id`,
      { resellerId }
    );

    if (!userDoc) {
      return res.status(404).json({ error: "Reseller user not found" });
    }

    // Update logo
    await sanity
      .patch(userDoc)
      .set({
        logo: {
          _type: "image",
          asset: {
            _type: "reference",
            _ref: imageAsset._id,
          },
        },
      })
      .commit();

    res.status(200).json({ success: true, logoUrl: imageAsset.url });
  } catch (error) {
    console.error("Error updating logo:", error);
    res.status(500).json({ error: "Failed to update logo" });
  }
}
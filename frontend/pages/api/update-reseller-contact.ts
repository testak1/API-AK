// pages/api/update-reseller-contact.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import client from "@/lib/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;
  const { contactInfo } = req.body;

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

    await client.patch(user._id).set({ contactInfo }).commit();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating contact info:", error);
    return res.status(500).json({ error: "Failed to update contact info" });
  }
}

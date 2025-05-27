// pages/api/update-password.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { hashPassword, verifyPassword } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    // Get the user document with password
    const user = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{
        _id,
        password
      }`,
      { resellerId }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Update password
    const hashedPassword = await hashPassword(newPassword);
    await sanity
      .patch(user._id) // Use the document ID directly
      .set({ password: hashedPassword })
      .commit();

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({ error: "Failed to update password" });
  }
}
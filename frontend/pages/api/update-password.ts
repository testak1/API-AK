// pages/api/update-password.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { hashPassword } from "@/lib/auth";

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
    // Verify current password
    const user = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{
        password
      }`,
      { resellerId }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }



    const hashedPassword = await hashPassword(newPassword);
    await sanity
      .patch(user._id)
      .set({ password: hashedPassword })
      .commit();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error updating password:", error);
    res.status(500).json({ error: "Failed to update password" });
  }
}
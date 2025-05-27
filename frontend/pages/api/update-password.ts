// pages/api/update-password.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { hashPassword, verifyPassword } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Missing fields" });
  }

  try {
    // Fetch the reseller user by resellerId
    const user = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{_id, password}`,
      { resellerId }
    );

    if (!user || !user._id) {
      return res.status(404).json({ error: "Reseller user not found" });
    }

    // Check if the current password is valid
    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(403).json({ error: "Incorrect current password" });
    }

    // Hash new password and update it in Sanity
    const hashed = await hashPassword(newPassword);
    await sanity.patch(user._id).set({ password: hashed }).commit();

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

import type {NextApiRequest, NextApiResponse} from "next";

// Disabled because this legacy endpoint compared plaintext passwords.
// Authentication is handled by NextAuth at /api/auth instead.
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Allow", ["POST"]);
  return res.status(410).json({
    error: "Legacy login disabled. Use /api/auth/signin.",
  });
}

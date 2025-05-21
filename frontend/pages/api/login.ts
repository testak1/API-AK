// /pages/api/login.ts
import type { NextApiRequest, NextApiResponse } from "next";
import jwt from "jsonwebtoken";
import client from "@/lib/sanity"; // Din Sanity-klient

const secret = process.env.JWT_SECRET!;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { email, password } = req.body;

  const query = `*[_type == "reseller" && email == $email && password == $password][0]{
    _id,
    name,
    resellerId
  }`;

  const user = await client.fetch(query, { email, password });

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { resellerId: user.resellerId, name: user.name },
    secret,
    {
      expiresIn: "2h",
    },
  );

  res.status(200).json({ token });
}

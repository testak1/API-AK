// pages/api/overrides.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  if (req.method === "POST") {
    const {
      overrideId,
      brand,
      model,
      year,
      engine,
      stageName,
      price,
      tunedHk,
      tunedNm,
    } = req.body;

    if (overrideId) {
      await sanity.patch(overrideId).set({ price, tunedHk, tunedNm }).commit();
    } else {
      await sanity.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model,
        year,
        engine,
        stageName,
        price,
        tunedHk,
        tunedNm,
      });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}

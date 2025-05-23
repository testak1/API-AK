import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  const [baseBrands, overrides] = await Promise.all([
    sanity.fetch(`*[_type == "brand"]{ name, models[]{ name, years[]{ range, engines[]{ label, fuel, stages[]{ name, price, tunedHk, tunedNm }}}}}`),
    sanity.fetch(`*[_type == "resellerOverride" && resellerId == $resellerId]`, { resellerId }),
  ]);

  return res.status(200).json({ brands: baseBrands, overrides });
}
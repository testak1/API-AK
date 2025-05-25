// pages/api/bulk-overrides.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { brand, model, year, stage1Price, stage2Price } = req.body;

  try {
    // 1. Delete existing overrides for this scope
    await sanity.delete({
      query: `*[_type == "resellerOverride" && 
              resellerId == $resellerId && 
              brand == $brand &&
              ${model ? "model == $model" : "!defined(model)"} &&
              ${year ? "year == $year" : "!defined(year)"}]`,
      params: { resellerId, brand, model, year },
    });

    // 2. Create new overrides if needed
    const transaction = sanity.transaction();
    let hasOperations = false;

    if (stage1Price) {
      transaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 1",
        price: Number(stage1Price),
        tunedHk: null,
        tunedNm: null,
      });
      hasOperations = true;
    }

    if (stage2Price) {
      transaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 2",
        price: Number(stage2Price),
        tunedHk: null,
        tunedNm: null,
      });
      hasOperations = true;
    }

    if (hasOperations) {
      await transaction.commit();
    }

    // 3. Return success
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

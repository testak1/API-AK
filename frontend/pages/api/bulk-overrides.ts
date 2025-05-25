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

  if (!brand) {
    return res.status(400).json({ error: "Missing brand" });
  }

  try {
    // 1. Find existing overrides to delete
    const idsToDelete = await sanity.fetch(
      `*[_type == "resellerOverride" &&
       resellerId == $resellerId &&
       brand == $brand &&
       ${model ? "model == $model" : "!defined(model)"} &&
       ${year ? "year == $year" : "!defined(year)"}]._id`,
      { resellerId, brand, model, year },
    );

    // 2. Prepare transaction
    let tx = sanity.transaction();

    // Delete existing overrides
    idsToDelete.forEach((id) => {
      tx = tx.delete(id);
    });

    // Create new overrides
    if (stage1Price) {
      tx = tx.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || undefined,
        year: year || undefined,
        stageName: "Stage 1",
        price: Number(stage1Price),
        tunedHk: undefined,
        tunedNm: undefined,
      });
    }

    if (stage2Price) {
      tx = tx.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || undefined,
        year: year || undefined,
        stageName: "Stage 2",
        price: Number(stage2Price),
        tunedHk: undefined,
        tunedNm: undefined,
      });
    }

    // 3. Execute if we have operations
    if (idsToDelete.length > 0 || stage1Price || stage2Price) {
      await tx.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err.message,
    });
  }
}

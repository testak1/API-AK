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
    const deleteQuery = `*[_type == "resellerOverride" && 
      resellerId == $resellerId && 
      brand == $brand &&
      ${model ? "model == $model" : "!defined(model)"} &&
      ${year ? "year == $year" : "!defined(year)"}]`;

    const existingOverrides = await sanity.fetch(deleteQuery, {
      resellerId,
      brand,
      model,
      year,
    });

    const deleteTransaction = sanity.transaction();
    existingOverrides.forEach((doc) => {
      if (doc._id) deleteTransaction.delete(doc._id);
    });

    if (existingOverrides.length > 0) {
      await deleteTransaction.commit();
    }

    // 2. Prepare new overrides if any
    const createTransaction = sanity.transaction();

    if (stage1Price) {
      createTransaction.create({
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
    }

    if (stage2Price) {
      createTransaction.create({
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
    }

    if (stage1Price || stage2Price) {
      await createTransaction.commit();
    }

    // 3. Fetch and return updated overrides
    const updatedOverrides = await sanity.fetch(
      `*[_type == "resellerOverride" && 
         resellerId == $resellerId && 
         brand == $brand &&
         ${model ? "model == $model" : "!defined(model)"} &&
         ${year ? "year == $year" : "!defined(year)"}]`,
      { resellerId, brand, model, year },
    );

    res.status(200).json(updatedOverrides);
  } catch (err) {
    console.error("Bulk override error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

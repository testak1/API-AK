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
    // Build GROQ query filter
    const filters = [
      `_type == "resellerOverride"`,
      `resellerId == $resellerId`,
      `brand == $brand`,
      model ? `model == $model` : `!defined(model)`,
      year ? `year == $year` : `!defined(year)`,
    ];
    const query = `*[${filters.join(" && ")}]`;

    const params: Record<string, any> = { resellerId, brand };
    if (model) params.model = model;
    if (year) params.year = year;

    const conversionRates = {
      EUR: 0.1,
      USD: 0.1,
      GBP: 0.08,
      SEK: 1,
    };

    // 1. Delete existing overrides in scope
    const existingOverrides = await sanity.fetch(query, params);
    const deleteTransaction = sanity.transaction();
    existingOverrides.forEach((doc) => {
      if (doc._id) deleteTransaction.delete(doc._id);
    });
    if (existingOverrides.length > 0) {
      await deleteTransaction.commit();
    }

    const settings = await sanity.fetch(
      `*[_type == "resellerConfig" && resellerId == $resellerId][0]{currency}`,
      { resellerId }
    );
    const currency = settings?.currency || "SEK";
    const rate = conversionRates[currency] || 1;
    
    const parsedStage1 = parseFloat(stage1Price);
    const parsedStage2 = parseFloat(stage2Price);
    const stage1SEK = !isNaN(parsedStage1) ? Math.round(parsedStage1 / rate) : null;
    const stage2SEK = !isNaN(parsedStage2) ? Math.round(parsedStage2 / rate) : null;

    // 2. Create new overrides
    const createTransaction = sanity.transaction();

    if (stage1SEK) {
      createTransaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 1",
        price: stage1SEK,
        tunedHk: null,
        tunedNm: null,
      });
    }
    
    if (stage2SEK) {
      createTransaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 2",
        price: stage2SEK,
        tunedHk: null,
        tunedNm: null,
      });
    }

    if (stage1SEK !== null || stage2SEK !== null) {
      await createTransaction.commit();
    }
    

    // 3. Return updated overrides
    const updatedOverrides = await sanity.fetch(query, params);
    return res.status(200).json(updatedOverrides);
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

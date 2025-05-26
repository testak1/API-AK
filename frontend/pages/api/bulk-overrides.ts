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
    const conversionRates = {
      EUR: 0.1,
      USD: 0.1,
      GBP: 0.08,
      SEK: 1,
    };

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

    const createTransaction = sanity.transaction();

    // Create model-level overrides (year and engine will be null)
    if (stage1SEK !== null) {
      const existingSteg1 = await sanity.fetch(
        `*[_type == "resellerOverride" && 
         resellerId == $resellerId && 
         brand == $brand && 
         model == $model && 
         year == null && 
         engine == null && 
         stageName == "Steg 1"][0]`,
        { resellerId, brand, model }
      );

      createTransaction.createOrReplace({
        _type: "resellerOverride",
        _id: existingSteg1?._id || undefined,
        resellerId,
        brand,
        model,
        year: null,
        engine: null,
        stageName: "Steg 1",
        price: stage1SEK,
        tunedHk: null, // Don't override HP for bulk updates
        tunedNm: null, // Don't override NM for bulk updates
      });
    }

    if (stage2SEK !== null) {
      const existingSteg2 = await sanity.fetch(
        `*[_type == "resellerOverride" && 
         resellerId == $resellerId && 
         brand == $brand && 
         model == $model && 
         year == null && 
         engine == null && 
         stageName == "Steg 2"][0]`,
        { resellerId, brand, model }
      );

      createTransaction.createOrReplace({
        _type: "resellerOverride",
        _id: existingSteg2?._id || undefined,
        resellerId,
        brand,
        model,
        year: null,
        engine: null,
        stageName: "Steg 2",
        price: stage2SEK,
        tunedHk: null, // Don't override HP for bulk updates
        tunedNm: null, // Don't override NM for bulk updates
      });
    }

    if (stage1SEK !== null || stage2SEK !== null) {
      await createTransaction.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

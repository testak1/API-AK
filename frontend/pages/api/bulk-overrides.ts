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

    // Fetch all engines under given scope
    let engineList = [];

    if (brand && model && year) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[name == $model][0].years[range == $year][0].engines`,
        { brand, model, year }
      );
      engineList = data?.map((e) => e.label) || [];
    } else if (brand && model) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[name == $model][0].years[].engines[]`,
        { brand, model }
      );
      engineList = [...new Set(data.map((e) => e.label))];
    } else if (brand) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[].years[].engines[]`,
        { brand }
      );
      engineList = [...new Set(data.map((e) => e.label))];
    }

    const createTransaction = sanity.transaction();

    for (const engine of engineList) {
      // Stage 1
      if (stage1SEK !== null) {
        const existingStage1 = await sanity.fetch(
          `*[_type == "resellerOverride" && resellerId == $resellerId && brand == $brand && model == $model && year == $year && engine == $engine && stageName == "Stage 1"][0]`,
          { resellerId, brand, model, year, engine }
        );

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingStage1?._id || undefined,
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Stage 1",
          price: stage1SEK,
          tunedHk: existingStage1?.tunedHk ?? null,
          tunedNm: existingStage1?.tunedNm ?? null,
        });
      }

      // Stage 2
      if (stage2SEK !== null) {
        const existingStage2 = await sanity.fetch(
          `*[_type == "resellerOverride" && resellerId == $resellerId && brand == $brand && model == $model && year == $year && engine == $engine && stageName == "Stage 2"][0]`,
          { resellerId, brand, model, year, engine }
        );

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingStage2?._id || undefined,
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Stage 2",
          price: stage2SEK,
          tunedHk: existingStage2?.tunedHk ?? null,
          tunedNm: existingStage2?.tunedNm ?? null,
        });
      }
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

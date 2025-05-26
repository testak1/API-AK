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

  const { brand, model, year, steg1Price, steg2Price } = req.body;

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

    const parsedSteg1 = parseFloat(steg1Price);
    const parsedSteg2 = parseFloat(steg2Price);
    const steg1SEK = !isNaN(parsedSteg1) ? Math.round(parsedSteg1 / rate) : null;
    const steg2SEK = !isNaN(parsedSteg2) ? Math.round(parsedSteg2 / rate) : null;

    // Fetch all engines under given scope
    let engineList = [];

    if (brand && model && year) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[name == $model][0].years[range == $year][0].engines`,
        { brand, model, year }
      );
      engineList = Array.isArray(data) ? data.map((e) => e.label) : [];
    } else if (brand && model) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[name == $model][0].years[].engines[]`,
        { brand, model }
      );
      engineList = Array.isArray(data)
        ? [...new Set(data.map((e) => e.label))]
        : [];
    } else if (brand) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0].models[].years[].engines[]`,
        { brand }
      );
      engineList = Array.isArray(data)
        ? [...new Set(data.map((e) => e.label))]
        : [];
    }

    const createTransaction = sanity.transaction();

    for (const engine of engineList) {
      // Stage 1
      if (steg1SEK !== null) {
        const existingSteg1 = await sanity.fetch(
          `*[_type == "resellerOverride" && resellerId == $resellerId && brand == $brand && model == $model && year == $year && engine == $engine && stageName == "Steg 1"][0]`,
          { resellerId, brand, model, year, engine }
        );

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg1?._id || undefined,
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Steg 1",
          price: steg1SEK,
          tunedHk: existingSteg1?.tunedHk ?? null,
          tunedNm: existingSteg1?.tunedNm ?? null,
        });
      }

      // Stage 2
      if (steg2SEK !== null) {
        const existingSteg2 = await sanity.fetch(
          `*[_type == "resellerOverride" && resellerId == $resellerId && brand == $brand && model == $model && year == $year && engine == $engine && stageName == "Steg 2"][0]`,
          { resellerId, brand, model, year, engine }
        );

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg2?._id || undefined,
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Steg 2",
          price: steg2SEK,
          tunedHk: existingSteg2?.tunedHk ?? null,
          tunedNm: existingSteg2?.tunedNm ?? null,
        });
      }
    }

    if (steg1SEK !== null || steg2SEK !== null) {
      await createTransaction.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

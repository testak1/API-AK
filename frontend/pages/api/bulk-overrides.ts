// pages/api/bulk-overrides.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

function generateOverrideId(resellerId, brand, model, year, engine, stageName) {
  const parts = [resellerId, brand, model || "", year || "", engine, stageName];
  return `override-${parts.map((p) => p.toLowerCase().replace(/\s+/g, "-")).join("-")}`;
}

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

    let engineList: string[] = [];

    if (brand && model && year) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0]{
          models[name == $model][0]{
            years[range == $year][0]{
              engines[]{ label }
            }
          }
        }`,
        { brand, model, year }
      );
      engineList = data?.models?.years?.engines?.map((e) => e.label) || [];

    } else if (brand && model) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0]{
          models[name == $model]{
            years[]{
              engines[]{ label }
            }
          }
        }`,
        { brand, model }
      );
      engineList = [
        ...new Set(
          (data?.models?.[0]?.years || [])
            .flatMap((y) => y.engines || [])
            .map((e) => e.label)
        ),
      ];

    } else if (brand) {
      const data = await sanity.fetch(
        `*[_type == "vehicleBrand" && name == $brand][0]{
          models[]{
            years[]{
              engines[]{ label }
            }
          }
        }`,
        { brand }
      );
      engineList = [
        ...new Set(
          (data?.models || [])
            .flatMap((m) => m.years || [])
            .flatMap((y) => y.engines || [])
            .map((e) => e.label)
        ),
      ];
    }

    const createTransaction = sanity.transaction();
    let didModify = false;

    for (const engine of engineList) {
      // === STEG 1 ===
      if (stage1SEK !== null) {
        const steg1Query = `*[_type == "resellerOverride" && 
          resellerId == $resellerId && 
          brand == $brand && 
          model == $model && 
          ${year ? "year == $year &&" : ""} 
          engine == $engine && 
          stageName == "Steg 1"][0]`;

        const steg1Params = {
          resellerId,
          brand,
          model,
          engine,
          ...(year ? { year } : {}),
        };

        const existingSteg1 = await sanity.fetch(steg1Query, steg1Params);

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg1?._id || generateOverrideId(resellerId, brand, model, year, engine, "Steg 1"),
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Steg 1",
          price: stage1SEK,
          tunedHk: existingSteg1?.tunedHk ?? null,
          tunedNm: existingSteg1?.tunedNm ?? null,
        });

        didModify = true;
      }

      // === STEG 2 ===
      if (stage2SEK !== null) {
        const steg2Query = `*[_type == "resellerOverride" && 
          resellerId == $resellerId && 
          brand == $brand && 
          model == $model && 
          ${year ? "year == $year &&" : ""} 
          engine == $engine && 
          stageName == "Steg 2"][0]`;

        const steg2Params = {
          resellerId,
          brand,
          model,
          engine,
          ...(year ? { year } : {}),
        };

        const existingSteg2 = await sanity.fetch(steg2Query, steg2Params);

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg2?._id || generateOverrideId(resellerId, brand, model, year, engine, "Steg 2"),
          resellerId,
          brand,
          model: model || null,
          year: year || null,
          engine,
          stageName: "Steg 2",
          price: stage2SEK,
          tunedHk: existingSteg2?.tunedHk ?? null,
          tunedNm: existingSteg2?.tunedNm ?? null,
        });

        didModify = true;
      }
    }

    if (didModify) {
      await createTransaction.commit();
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// pages/api/bulk-overrides.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

function generateOverrideId(resellerId, brand, model, year, engine, stageName) {
  const parts = [resellerId, brand, model || "", year || "", engine, stageName];
  return `override-${parts.map((p) => slugify(p || "")).join("-")}`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;
  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  let { brand, model, stage1Price, stage2Price, stage3Price, stage4Price, dsgPrice } = req.body;
  brand = brand?.trim();
  model = model?.trim();

  try {
    const conversionRates = { EUR: 0.1, USD: 0.1, GBP: 0.08, SEK: 1 };
    const settings = await sanity.fetch(
      `*[_type == "resellerConfig" && resellerId == $resellerId][0]{currency}`,
      { resellerId }
    );
    const currency = settings?.currency || "SEK";
    const rate = conversionRates[currency] || 1;

    
const parseToSEK = (val: string | number | null) => {
  const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return !isNaN(parsed) ? Math.round(parsed / rate) : null;
};

    const pricesSEK = {
      "Steg 1": parseToSEK(stage1Price),
      "Steg 2": parseToSEK(stage2Price),
      "Steg 3": parseToSEK(stage3Price),
      "Steg 4": parseToSEK(stage4Price),
      "DSG": parseToSEK(dsgPrice),
    };

    const allBrands = await sanity.fetch(
      `*[_type == "brand"]{
        name,
        slug,
        models[]{
          name,
          slug,
          years[]{
            range,
            slug,
            engines[]{
              label,
              stages[]{
                name,
                tunedHk,
                tunedNm
              }
            }
          }
        }
      }`
    );

    const normBrand = normalizeString(brand || "");
    const normModel = normalizeString(model || "");

    const matchedBrand = allBrands.find((b) =>
      normalizeString(b.name) === normBrand ||
      normalizeString(b.slug?.current || "") === normBrand ||
      normalizeString(b.name).includes(normBrand)
    );

    if (!matchedBrand) return res.status(404).json({ error: "Brand not found" });

    const matchedModel = matchedBrand.models?.find(
      (m) =>
        normalizeString(m.name) === normModel ||
        normalizeString(m.slug?.current || "") === normModel ||
        normalizeString(m.name).includes(normModel)
    );

    if (!matchedModel) return res.status(404).json({ error: "Model not found" });

    const yearsToProcess = matchedModel.years || [];
    if (!yearsToProcess.length) return res.status(404).json({ error: "No years with engines found" });

    const createTransaction = sanity.transaction();
    let updatedCount = 0;

    for (const yearEntry of yearsToProcess) {
      const yearValue = yearEntry.range;
      const engines = yearEntry.engines || [];

      for (const engine of engines) {
        const getStageData = (name: string) =>
          engine.stages?.find((s) => normalizeString(s.name) === normalizeString(name));

        for (const stageName of ["Steg 1", "Steg 2", "Steg 3", "Steg 4", "DSG"]) {
          const priceSEK = pricesSEK[stageName];
          if (priceSEK === null) continue;

          const query = `*[_type == "resellerOverride" &&
            resellerId == $resellerId &&
            brand == $brand &&
            model == $model &&
            year == $year &&
            engine == $engine &&
            stageName == $stageName][0]`;

          const params = {
            resellerId,
            brand: matchedBrand.name,
            model: matchedModel.name,
            year: yearValue,
            engine: engine.label,
            stageName,
          };

          const existing = await sanity.fetch(query, params);
          const stageData = getStageData(stageName);

          createTransaction.createOrReplace({
            _type: "resellerOverride",
            _id: existing?._id ||
              generateOverrideId(resellerId, matchedBrand.name, matchedModel.name, yearValue, engine.label, stageName),
            resellerId,
            brand: matchedBrand.name,
            model: matchedModel.name,
            year: yearValue,
            engine: engine.label,
            stageName,
            price: priceSEK,
            tunedHk: existing?.tunedHk ?? stageData?.tunedHk ?? null,
            tunedNm: existing?.tunedNm ?? stageData?.tunedNm ?? null,
          });

          updatedCount++;
        }
      }
    }

    if (updatedCount > 0) {
      await createTransaction.commit();
      console.log(`Bulk override completed. ${updatedCount} overrides updated.`);
    }

    return res.status(200).json({ success: true, updated: updatedCount });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

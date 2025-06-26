// pages/api/bulk-overrides.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

// Improved normalization - only removes spaces for more precise matching
const normalizeString = (str: string) => str.toLowerCase().replace(/\s+/g, "");

const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

function generateOverrideId(
  resellerId: string,
  brand: string,
  model: string,
  year: string,
  engine: string,
  stageName: string,
) {
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

  let {
    brand,
    model,
    year, // Added year parameter
    stage1Price,
    stage2Price,
    stage3Price,
    stage4Price,
    dsgPrice,
  } = req.body;

  brand = brand?.trim();
  model = model?.trim();
  year = year?.trim();

  try {
    console.log(`Processing bulk override for:`, {
      brand,
      model,
      year,
      resellerId,
    });

    const conversionRates = { EUR: 0.1, USD: 0.1, GBP: 0.08, SEK: 1 };
    const settings = await sanity.fetch(
      `*[_type == "resellerConfig" && resellerId == $resellerId][0]{currency}`,
      { resellerId },
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
      DSG: parseToSEK(dsgPrice),
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
                price,
                tunedHk,
                tunedNm
              }
            }
          }
        }
      }`,
    );

    const normBrand = normalizeString(brand || "");
    const matchedBrand = allBrands.find(
      (b) => normalizeString(b.name) === normBrand, // Strict brand matching
    );

    if (!matchedBrand) {
      return res.status(404).json({
        error: "Brand not found",
        details: `No brand matching '${brand}'`,
        availableBrands: allBrands.map((b) => b.name),
      });
    }

    const normModel = normalizeString(model || "");
    const matchedModel = matchedBrand.models?.find(
      (m) => normalizeString(m.name) === normModel, // Strict model matching
    );

    if (!matchedModel) {
      return res.status(404).json({
        error: "Model not found",
        details: `No exact match for model '${model}' in brand '${brand}'`,
        availableModels: matchedBrand.models?.map((m) => m.name),
      });
    }

    // Filter years if year parameter exists
    const yearsToProcess = year
      ? matchedModel.years?.filter((y) => y.range === year) || []
      : matchedModel.years || [];

    if (yearsToProcess.length === 0) {
      return res.status(404).json({
        error: year ? "Year not found" : "No years available",
        details: year
          ? `No matching year '${year}' for model '${model}'`
          : `No years found for model '${model}'`,
        availableYears: matchedModel.years?.map((y) => y.range),
      });
    }

    // Add this to your bulk-overrides.ts before the transaction code
    if (req.body.preview) {
      // Return preview data without making changes
      const previewData = yearsToProcess
        .flatMap((yearEntry) => {
          const yearValue = yearEntry.range;
          return (
            yearEntry.engines?.flatMap((engine) => {
              return ["Steg 1", "Steg 2", "Steg 3", "Steg 4", "DSG"].map(
                (stageName) => {
                  const priceSEK = pricesSEK[stageName];
                  return {
                    brand: matchedBrand.name,
                    model: matchedModel.name,
                    year: yearValue,
                    engine: engine.label,
                    stageName,
                    newPrice: priceSEK,
                    currentPrice: engine.stages?.find(
                      (s) =>
                        normalizeString(s.name) === normalizeString(stageName),
                    )?.price,
                  };
                },
              );
            }) || []
          );
        })
        .filter((item) => item.newPrice !== null);

      return res.status(200).json({
        preview: true,
        items: previewData,
        count: previewData.length,
      });
    }

    const createTransaction = sanity.transaction();
    let updatedCount = 0;

    for (const yearEntry of yearsToProcess) {
      const yearValue = yearEntry.range;
      const engines = yearEntry.engines || [];

      for (const engine of engines) {
        const getStageData = (name: string) =>
          engine.stages?.find(
            (s) => normalizeString(s.name) === normalizeString(name),
          );

        for (const stageName of [
          "Steg 1",
          "Steg 2",
          "Steg 3",
          "Steg 4",
          "DSG",
        ]) {
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
            _id:
              existing?._id ||
              generateOverrideId(
                resellerId,
                matchedBrand.name,
                matchedModel.name,
                yearValue,
                engine.label,
                stageName,
              ),
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
      console.log(
        `Bulk override completed. ${updatedCount} overrides updated.`,
      );
      return res.status(200).json({
        success: true,
        updated: updatedCount,
        brand: matchedBrand.name,
        model: matchedModel.name,
        years: yearsToProcess.map((y) => y.range),
      });
    }

    return res.status(200).json({
      success: true,
      updated: 0,
      message: "No changes were made (all prices were empty)",
    });
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
}

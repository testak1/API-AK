// pages/api/bulk-overrides.ts

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

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
    year,
    stage1Price,
    stage2Price,
    stage3Price,
    stage4Price,
    dsgPrice,
    preview,
    applyLevel,
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
      applyLevel,
    });

    // Get reseller's currency settings
    const settings = await sanity.fetch(
      `*[_type == "resellerConfig" && resellerId == $resellerId][0]{currency}`,
      { resellerId },
    );
    const currency = settings?.currency || "SEK";
    const conversionRates = { EUR: 0.1, USD: 0.1, GBP: 0.08, SEK: 1 };
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

    // Fetch all brands data
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

    // Find matching brand
    const normBrand = normalizeString(brand || "");
    const matchedBrand = allBrands.find(
      (b) => normalizeString(b.name) === normBrand,
    );

    if (!matchedBrand) {
      return res.status(404).json({
        error: "Brand not found",
        details: `No brand matching '${brand}'`,
        availableBrands: allBrands.map((b) => b.name),
      });
    }

    let yearsToProcess = [];
    let matchedModel = null;

    if (applyLevel === "year" && year) {
      // Year-level override - find the year across all models
      matchedBrand.models?.forEach((m) => {
        m.years?.forEach((y) => {
          if (y.range === year) {
            yearsToProcess.push({ ...y, model: m.name });
          }
        });
      });

      if (yearsToProcess.length === 0) {
        return res.status(404).json({
          error: "Year not found",
          details: `No matching year '${year}' in brand '${brand}'`,
          availableYears: matchedBrand.models
            ?.flatMap((m) => m.years?.map((y) => y.range) || [])
            .filter((v, i, a) => a.indexOf(v) === i),
        });
      }
    } else {
      // Model-level override
      const normModel = normalizeString(model || "");
      matchedModel = matchedBrand.models?.find(
        (m) => normalizeString(m.name) === normModel,
      );

      if (!matchedModel) {
        return res.status(404).json({
          error: "Model not found",
          details: `No model matching '${model}' in brand '${brand}'`,
          availableModels: matchedBrand.models?.map((m) => m.name),
        });
      }

      yearsToProcess =
        matchedModel.years?.map((y) => ({ ...y, model: matchedModel.name })) ||
        [];
    }

    if (preview) {
      // Generate preview data with converted prices
      const previewData = yearsToProcess
        .flatMap((yearEntry) => {
          return (
            yearEntry.engines?.flatMap((engine) => {
              return ["Steg 1", "Steg 2", "Steg 3", "Steg 4", "DSG"].map(
                (stageName) => {
                  const priceSEK = pricesSEK[stageName];
                  if (priceSEK === null) return null;

                  const stageData = engine.stages?.find(
                    (s) =>
                      normalizeString(s.name) === normalizeString(stageName),
                  );

                  return {
                    brand: matchedBrand.name,
                    model: yearEntry.model,
                    year: yearEntry.range,
                    engine: engine.label,
                    stageName,
                    priceSEK, // Original SEK value
                    price: Math.round(priceSEK * rate), // Converted price
                    currentPriceSEK: stageData?.price,
                    currentPrice: stageData?.price
                      ? Math.round(stageData.price * rate)
                      : null,
                    currency,
                    currencySymbol:
                      currency === "SEK"
                        ? "kr"
                        : currency === "EUR"
                          ? "€"
                          : currency === "USD"
                            ? "$"
                            : currency === "GBP"
                              ? "£"
                              : currency,
                  };
                },
              );
            }) || []
          );
        })
        .filter((item) => item !== null);

      return res.status(200).json({
        preview: true,
        items: previewData,
        count: previewData.length,
        currency,
        currencySymbol:
          currency === "SEK"
            ? "kr"
            : currency === "EUR"
              ? "€"
              : currency === "USD"
                ? "$"
                : currency === "GBP"
                  ? "£"
                  : currency,
      });
    }

    // Actual override creation
    const createTransaction = sanity.transaction();
    let updatedCount = 0;

    for (const yearEntry of yearsToProcess) {
      const engines = yearEntry.engines || [];

      for (const engine of engines) {
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
            model: yearEntry.model,
            year: yearEntry.range,
            engine: engine.label,
            stageName,
          };

          const existing = await sanity.fetch(query, params);
          const stageData = engine.stages?.find(
            (s) => normalizeString(s.name) === normalizeString(stageName),
          );

          createTransaction.createOrReplace({
            _type: "resellerOverride",
            _id:
              existing?._id ||
              generateOverrideId(
                resellerId,
                matchedBrand.name,
                yearEntry.model,
                yearEntry.range,
                engine.label,
                stageName,
              ),
            resellerId,
            brand: matchedBrand.name,
            model: yearEntry.model,
            year: yearEntry.range,
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
      return res.status(200).json({
        success: true,
        updated: updatedCount,
        brand: matchedBrand.name,
        model: matchedModel?.name || "Multiple models",
        years: [...new Set(yearsToProcess.map((y) => y.range))],
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

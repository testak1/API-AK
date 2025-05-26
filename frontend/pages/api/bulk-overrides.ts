import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

// Helpers
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

  let { brand, model, year, stage1Price, stage2Price } = req.body;

  brand = brand?.trim();
  model = model?.trim();
  year = year?.trim();

  try {
    const conversionRates = { EUR: 0.1, USD: 0.1, GBP: 0.08, SEK: 1 };
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

    // === Fetch all real brands ===
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
            engines[]{ label }
          }
        }
      }`
    );

    const normBrand = normalizeString(brand || "");
    const normModel = normalizeString(model || "");
    const normYear = normalizeString(year || "");

    const matchedBrand = allBrands.find((b) =>
      normalizeString(b.name) === normBrand ||
      normalizeString(b.slug?.current || "") === normBrand ||
      normalizeString(b.name).includes(normBrand)
    );

    if (!matchedBrand) {
      console.warn("Brand not found:", brand);
      return res.status(404).json({ error: "Brand not found" });
    }

    let matchedModel = null;
    if (model) {
      matchedModel =
        matchedBrand.models?.find(
          (m) =>
            normalizeString(m.name) === normModel ||
            normalizeString(m.slug?.current || "") === normModel ||
            normalizeString(m.name).includes(normModel)
        ) || null;

      if (!matchedModel) {
        console.warn("Model not found under brand:", model);
        return res.status(404).json({ error: "Model not found" });
      }
    }

    let matchedYear = null;
    if (matchedModel && year) {
      matchedYear =
        matchedModel.years?.find(
          (y) =>
            normalizeString(y.range) === normYear ||
            normalizeString(y.slug || "") === normYear
        ) || null;

      if (!matchedYear) {
        console.warn("Year not found under model:", year);
        return res.status(404).json({ error: "Year not found" });
      }
    }

    let engineList: string[] = [];
    if (matchedYear) {
      engineList = matchedYear.engines?.map((e: { label: string }) => e.label) as string[] || [];
    } else if (matchedModel) {
      engineList = [
        ...new Set(
          (matchedModel.years || [])
            .flatMap((y) => (y.engines as { label: string }[]) || [])
            .map((e) => e.label)
        ),
      ] as string[];
    } else {
      engineList = [
        ...new Set(
          (matchedBrand.models || [])
            .flatMap((m) => m.years || [])
            .flatMap((y) => (y.engines as { label: string }[]) || [])
            .map((e) => e.label)
        ),
      ] as string[];
    }

    if (!engineList.length) {
      console.warn("No engines found for selection:", { brand, model, year });
      return res.status(404).json({ error: "No engines found" });
    }

    const createTransaction = sanity.transaction();
    let updatedCount = 0;

    for (const engine of engineList) {
      if (stage1SEK !== null) {
        const steg1Query = `*[_type == "resellerOverride" &&
          resellerId == $resellerId &&
          brand == $brand &&
          model == $model &&
          ${year ? "year == $year &&" : ""}
          engine == $engine &&
          stageName == "Stage 1"][0]`;

        const steg1Params = {
          resellerId,
          brand: matchedBrand.name,
          model: matchedModel?.name || null,
          engine,
          ...(year ? { year } : {}),
        };

        const existingSteg1 = await sanity.fetch(steg1Query, steg1Params);

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg1?._id ||
            generateOverrideId(resellerId, matchedBrand.name, matchedModel?.name, year, engine, "Stage 1"),
          resellerId,
          brand: matchedBrand.name,
          model: matchedModel?.name || null,
          year: year || null,
          engine,
          stageName: "Stage 1",
          price: stage1SEK,
          tunedHk: existingSteg1?.tunedHk ?? null,
          tunedNm: existingSteg1?.tunedNm ?? null,
        });

        updatedCount++;
      }

      if (stage2SEK !== null) {
        const steg2Query = `*[_type == "resellerOverride" &&
          resellerId == $resellerId &&
          brand == $brand &&
          model == $model &&
          ${year ? "year == $year &&" : ""}
          engine == $engine &&
          stageName == "Stage 2"][0]`;

        const steg2Params = {
          resellerId,
          brand: matchedBrand.name,
          model: matchedModel?.name || null,
          engine,
          ...(year ? { year } : {}),
        };

        const existingSteg2 = await sanity.fetch(steg2Query, steg2Params);

        createTransaction.createOrReplace({
          _type: "resellerOverride",
          _id: existingSteg2?._id ||
            generateOverrideId(resellerId, matchedBrand.name, matchedModel?.name, year, engine, "Stage 2"),
          resellerId,
          brand: matchedBrand.name,
          model: matchedModel?.name || null,
          year: year || null,
          engine,
          stageName: "Stage 2",
          price: stage2SEK,
          tunedHk: existingSteg2?.tunedHk ?? null,
          tunedNm: existingSteg2?.tunedNm ?? null,
        });

        updatedCount++;
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

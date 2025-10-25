import { NextApiRequest, NextApiResponse } from "next";
import { sanityClient } from "@/lib/sanity.server";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Endast POST tillåten" });
  }

  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Tom importlista" });
    }

    const results = [];

    for (const item of items) {
      const brandName = item.brand?.trim();
      const modelName = item.model?.trim();
      const yearRange = item.year?.trim();
      const engineLabel = item.engine?.trim();

      const stage = {
        name: "Steg 1",
        origHk: item.origHk,
        tunedHk: item.tunedHk,
        origNm: item.origNm,
        tunedNm: item.tunedNm,
        price: item.price,
      };

      // 🔍 Hitta branden
      const brandDoc = await sanityClient.fetch(
        `*[_type == "brand" && lower(name) == lower($name)][0]{_id, models}`,
        { name: brandName }
      );

      if (!brandDoc?._id) {
        console.warn(`⚠️ Hittade inte brand: ${brandName}`);
        results.push({ brand: brandName, ok: false, reason: "brand not found" });
        continue;
      }

      // 🔎 Sök efter modellen
      const modelIndex = brandDoc.models?.findIndex(
        (m: any) => m.name.toLowerCase() === modelName.toLowerCase()
      );

      // 🧱 Om modellen inte finns, skapa den
      if (modelIndex === -1 || modelIndex === undefined) {
        await sanityClient
          .patch(brandDoc._id)
          .setIfMissing({ models: [] })
          .insert("after", "models[-1]", [
            {
              name: modelName,
              years: [
                {
                  range: yearRange,
                  engines: [
                    {
                      fuel: "Bensin", // du kan ändra logiken här
                      label: engineLabel,
                      stages: [stage],
                    },
                  ],
                },
              ],
            },
          ])
          .commit();

        results.push({ brand: brandName, model: modelName, created: "new model" });
        continue;
      }

      // Om modellen finns, hämta dess years-array
      const model = brandDoc.models[modelIndex];
      const yearIndex = model.years?.findIndex(
        (y: any) => y.range.toLowerCase() === yearRange.toLowerCase()
      );

      if (yearIndex === -1 || yearIndex === undefined) {
        await sanityClient
          .patch(brandDoc._id)
          .insert(`after`, `models[${modelIndex}].years[-1]`, [
            {
              range: yearRange,
              engines: [
                {
                  fuel: "Bensin",
                  label: engineLabel,
                  stages: [stage],
                },
              ],
            },
          ])
          .commit();

        results.push({
          brand: brandName,
          model: modelName,
          year: yearRange,
          created: "new year",
        });
        continue;
      }

      // Om år finns, lägg till motorn om den saknas
      const year = model.years[yearIndex];
      const engineExists = year.engines?.some(
        (e: any) => e.label.toLowerCase() === engineLabel.toLowerCase()
      );

      if (!engineExists) {
        await sanityClient
          .patch(brandDoc._id)
          .insert("after", `models[${modelIndex}].years[${yearIndex}].engines[-1]`, [
            {
              fuel: "Bensin",
              label: engineLabel,
              stages: [stage],
            },
          ])
          .commit();

        results.push({
          brand: brandName,
          model: modelName,
          year: yearRange,
          engine: engineLabel,
          created: "new engine",
        });
      } else {
        results.push({
          brand: brandName,
          model: modelName,
          year: yearRange,
          engine: engineLabel,
          created: "already exists",
        });
      }
    }

    res.status(200).json({
      message: "Import klar",
      summary: {
        total: results.length,
        created: results.filter((r) => r.created && r.created !== "already exists").length,
      },
      results,
    });
  } catch (err: any) {
    console.error("🔥 Importfel:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}

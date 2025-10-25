import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const items = req.body.items;
    if (!Array.isArray(items)) {
      return res.status(400).json({error: "Missing or invalid 'items' array"});
    }

    const created = [];

    for (const item of items) {
      const brandName = item.brand?.trim();
      const modelName = item.model?.trim();
      const yearRange = item.year?.trim();
      const engineLabel = item.engine?.trim();

      // 💡 Hämta brand dokumentet (måste redan finnas i Sanity)
      const brandDoc = await sanityClient.fetch(
        `*[_type == "brand" && lower(name) == lower($name)][0]{ _id }`,
        {name: brandName}
      );

      if (!brandDoc?._id) {
        console.warn(`⚠️ Hittade inte brand i Sanity: ${brandName}`);
        continue;
      }

      // 📘 Hämta modell (skapa om den inte finns)
      let modelDoc = await sanityClient.fetch(
        `*[_type == "model" && name match $model && brand._ref == $brandId][0]{ _id, years }`,
        {model: modelName, brandId: brandDoc._id}
      );

      if (!modelDoc) {
        modelDoc = await sanityClient.create({
          _type: "model",
          name: modelName,
          brand: {_type: "reference", _ref: brandDoc._id},
          years: [],
        });
        console.log(`✅ Skapade ny modell: ${brandName} / ${modelName}`);
      }

      // 🧭 Leta årsmodell (lägg till om saknas)
      let yearObj = modelDoc.years?.find((y: any) => y.range === yearRange);
      if (!yearObj) {
        yearObj = {
          _key: Math.random().toString(36).substr(2, 9),
          range: yearRange,
          engines: [],
        };
        modelDoc.years.push(yearObj);
      }

      // ⚙️ Lägg till motor (endast om saknas)
      if (!yearObj.engines.find((e: any) => e.label === engineLabel)) {
        yearObj.engines.push({
          _key: Math.random().toString(36).substr(2, 9),
          label: engineLabel,
          fuel: item.fuel || "Okänd",
          stages: [
            {
              _key: Math.random().toString(36).substr(2, 9),
              name: "Steg 1",
              origHk: item.origHk || null,
              tunedHk: item.tunedHk || null,
              origNm: item.origNm || null,
              tunedNm: item.tunedNm || null,
              price: item.price || null,
            },
          ],
        });
      }

      // 💾 Uppdatera modellen i Sanity
      await sanityClient
        .patch(modelDoc._id)
        .set({years: modelDoc.years})
        .commit();

      created.push({brandName, modelName, yearRange, engineLabel});
    }

    res.status(200).json({
      success: true,
      message: `Importerade ${created.length} objekt till Sanity`,
      created,
    });
  } catch (err) {
    console.error("❌ Import error", err);
    res
      .status(500)
      .json({error: "Import failed", details: (err as any).message});
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { sanityClient } from "@/lib/sanity.server";

export const config = {
  api: { bodyParser: { sizeLimit: "10mb" } },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const missingItems = req.body.items;
    if (!Array.isArray(missingItems)) {
      return res.status(400).json({ error: "Missing or invalid 'items' array" });
    }

    const created = [];

    for (const item of missingItems) {
      const brandName = item.brand.trim().toLowerCase();
      const modelName = item.model?.trim();
      const yearRange = item.year?.trim();
      const engine = item.engine?.trim();

      if (item.type === "model") {
        // Skapa modell om den inte finns
        await sanityClient.create({
          _type: "model",
          title: modelName,
          brand: { _ref: brandName, _type: "reference" },
          years: [],
        });
      } else if (item.type === "year") {
        // Lägg till year i befintlig modell
        // (pseudo: här bör du först hämta modellen via GROQ och pusha en year)
      } else if (item.type === "engine") {
        // Lägg till engine i year-arrayen
        // (pseudo: hämta brand → model → year → append engine-objekt)
      }

      created.push(item);
    }

    res.status(200).json({ success: true, createdCount: created.length });
  } catch (err) {
    console.error("❌ Import error", err);
    res.status(500).json({ error: "Failed to import missing items" });
  }
}

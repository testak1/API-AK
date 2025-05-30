// pages/api/suggested-products.ts
import type { NextApiRequest, NextApiResponse } from "next";

const PRESTASHOP_API_URL = "https://aktuning.se/api";
const API_KEY = "6GWZE1MC2KQ8MPAT1I8NZB4IHI1G7ETZ";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const engineName = (query.engine as string)?.trim();
  const carModel = (query.model as string)?.trim();

  if (!engineName) return res.status(400).json({ error: "Missing engine name" });

  try {
    // First try to find exact matches in product references
    const exactMatchRes = await fetch(
      `${PRESTASHOP_API_URL}/products?display=full&filter[reference]=${encodeURIComponent(engineName)}&output_format=JSON&ws_key=${API_KEY}`,
      { headers: { Accept: "application/json" } }
    );

    if (!exactMatchRes.ok) throw new Error("Failed to fetch from PrestaShop");
    
    let products = (await exactMatchRes.json()).products || [];

    // If no exact matches, try broader search
    if (products.length === 0) {
      const searchTerms = [engineName, carModel].filter(Boolean).join(" ");
      const searchRes = await fetch(
        `${PRESTASHOP_API_URL}/search?language=1&query=${encodeURIComponent(searchTerms)}&ws_key=${API_KEY}`,
        { headers: { Accept: "application/json" } }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.products) {
          // Get full product details for the top matches
          const productIds = searchData.products.slice(0, 6).map(p => p.id_product);
          if (productIds.length > 0) {
            const productsRes = await fetch(
              `${PRESTASHOP_API_URL}/products?display=basic&filter[id]=[${productIds.join(",")}]&output_format=JSON&ws_key=${API_KEY}`,
              { headers: { Accept: "application/json" } }
            );
            if (productsRes.ok) {
              products = (await productsRes.json()).products || [];
            }
          }
        }
      }
    }

    res.status(200).json({ products });
  } catch (err) {
    console.error("Suggested products error:", err);
    res.status(500).json({ error: "Internal error", message: (err as Error).message });
  }
}
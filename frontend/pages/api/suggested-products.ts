// pages/api/suggested-products.ts
import type { NextApiRequest, NextApiResponse } from "next";

const API_URL = "https://aktuning.se/api";
const API_KEY = "6GWZE1MC2KQ8MPAT1I8NZB4IHI1G7ETZ";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query } = req;
  const term = (query.term as string)?.trim();

  if (!term) return res.status(400).json({ error: "Missing search term" });

  try {
    const prestashopRes = await fetch(
      `${API_URL}/products?display=full&filter[name]=%[${term}]%&output_format=JSON&ws_key=${API_KEY}`,
      {
        headers: {
          Accept: "application/json",
        },
      },
    );

    if (!prestashopRes.ok) throw new Error("Failed to fetch from PrestaShop");

    const data = await prestashopRes.json();
    res.status(200).json({ products: data.products || [] });
  } catch (err) {
    res.status(500).json({ error: "Internal error", message: (err as Error).message });
  }
}

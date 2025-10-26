import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

// 1. UPPDATERAD GROQ-FRÅGA
const jetSkiQuery = `
  *[_type == "jetSkiBrand"] | order(name asc) {
    _id,
    name,
    logo,
    // Använd coalesce() för att garantera en array, även om models är null
    "models": coalesce(models[]->{
      _id,
      model,
      year,
      engine,
      origHk,
      tunedHk,
      price
    } | order(model asc), []) // <--- HÄR ÄR ÄNDRINGEN
  }
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({message: "Endast GET tillåten"});
  }

  try {
    const brands = await sanityClient.fetch(jetSkiQuery);
    res.status(200).json({brands});
  } catch (err: any) {
    console.error("🔥 Fel vid hämtning av jetski-data:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

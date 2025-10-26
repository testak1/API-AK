import {NextApiRequest, NextApiResponse} from "next";
// Importera din befintliga sanity-klient för servern
import {sanityClient} from "@/lib/sanity.server";

// 1. GROQ-frågan vi definierade tidigare
const jetSkiQuery = `
  *[_type == "jetSkiBrand"] | order(name asc) {
    _id,
    name,
    logo,
    "models": models[]->{ // Följer referensen från brand till jetSki
      _id,
      model,
      year,
      engine,
      origHk,
      tunedHk,
      price
    } | order(model asc) // Sorterar modellerna i bokstavsordning
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
    // 2. Hämta datan från Sanity
    const brands = await sanityClient.fetch(jetSkiQuery);
    // 3. Skicka tillbaka datan som JSON
    res.status(200).json({brands});
  } catch (err: any) {
    console.error("🔥 Fel vid hämtning av jetski-data:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

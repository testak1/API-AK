// pages/api/bike-brands-with-models.ts
import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

const bikeBrandsWithModelsQuery = `
  *[_type == "bikeBrand"] | order(name asc) {
    _id,
    name,
    logo,
    "models": *[_type == "bike" && brand._ref == ^._id] | order(model asc, year desc) {
      _id,
      model,
      year,
      engine,
      vehicleType,
      origHk,
      tunedHk,
      origNm,
      tunedNm,
      price
    }
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
    const brands = await sanityClient.fetch(bikeBrandsWithModelsQuery);
    res.status(200).json({brands});
  } catch (err: any) {
    console.error("🔥 Fel vid hämtning av bike/quad-data:", err);
    res.status(500).json({message: "Server error", error: err.message});
  }
}

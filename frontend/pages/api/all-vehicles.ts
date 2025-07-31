// pages/api/all-vehicles.ts
import type {NextApiRequest, NextApiResponse} from "next";
import {groq} from "next-sanity";
import client from "@/lib/sanity";

// Frågan hämtar alla motorer och deras kopplade data
const allVehiclesQuery = groq`*[_type == "engine"]{
  "engineLabel": label,
  "engineFuel": fuel,
  "engineHp": origHk,
  "engineVolume": engineVolume,
  "yearRange": year->range,
  "modelName": model->name,
  "brandName": brand->name
}`;

type Data = {
  vehicles: any[];
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data | {message: string}>
) {
  try {
    const vehicles = await client.fetch(allVehiclesQuery);

    if (!vehicles) {
      // Om Sanity returnerar null eller undefined
      console.error(
        "Sanity fetch returnerade ett icke-array-värde för all-vehicles"
      );
      return res.status(200).json({vehicles: []});
    }

    res.status(200).json({vehicles});
  } catch (error) {
    console.error("Sanity fetch error in all-vehicles:", error);
    res.status(500).json({message: "Kunde inte hämta fordonsdata"});
  }
}

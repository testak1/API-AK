// pages/api/all-vehicles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { groq } from 'next-sanity';

// Korrekt import baserad på dina andra API-filer
import client from '@/lib/sanity';

const allVehiclesQuery = groq`*[_type == "engine"]{
  "engineLabel": label,
  "engineFuel": fuel,
  "engineHp": origHk,
  "yearRange": year->range,
  "modelName": model->name,
  "brandName": brand->name
}`;

type Data = {
  vehicles: any;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    // Använder 'client' som är korrekt namn från din import
    const vehicles = await client.fetch(allVehiclesQuery);
    res.status(200).json({ vehicles });
  } catch (error) {
    console.error('Sanity fetch error in all-vehicles:', error);
    res.status(500).json({ vehicles: [] });
  }
}

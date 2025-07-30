// pages/api/all-vehicles.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { sanityClient } from '../../lib/sanity.server'; // Importerar från samma ställe som dina andra API-filer
import { groq } from 'next-sanity';

// Denna GROQ-fråga är baserad på din befintliga datastruktur.
// Den hämtar alla motorer och deras "föräldrar" (år, modell, märke) i ett svep.
const allVehiclesQuery = groq`*[_type == "engine"]{
  "engineLabel": label,
  "engineFuel": fuel,
  "engineHp": origHk,
  "yearRange": year->range,
  "modelName": model->name,
  "brandName": brand->name
}`;

type Data = {
  vehicles: any; // Du kan definiera en striktare typ här om du vill
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  try {
    const vehicles = await sanityClient.fetch(allVehiclesQuery);
    res.status(200).json({ vehicles });
  } catch (error) {
    console.error('Sanity fetch error in all-vehicles:', error);
    res.status(500).json({ vehicles: [] }); // Returnera en tom array vid fel
  }
}

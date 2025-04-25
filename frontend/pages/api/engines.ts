import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand, model, year } = req.query;
  if (!brand || !model || !year) return res.status(400).json({ error: 'Missing parameters' });

  const query = `
    *[_type == "brand" && name == $brand][0]
      .models[name == $model][0]
      .years[range == $year][0]
      .engines[]{
        _id,
        label,
        fuel,
        "stages": stages[]{
          name, origHk, tunedHk, origNm, tunedNm, price
        },
        "globalAktPlusOptions": []
      }
  `;
  try {
    const result = await client.fetch(query, { brand, model, year });
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load engines' });
  }
}

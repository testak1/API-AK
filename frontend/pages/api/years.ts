// pages/api/years.ts
import { NextApiRequest, NextApiResponse } from 'next';
import client from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand, model } = req.query;
  if (!brand || !model) return res.status(400).json({ error: 'Missing brand or model' });

  const query = `
    *[_type == "brand" && name == $brand][0].models[name == $model][0].years[]{
      range
    }
  `;
  try {
    const result = await client.fetch(query, { brand, model });
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load years' });
  }
}

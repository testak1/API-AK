// pages/api/models.ts
import { NextApiRequest, NextApiResponse } from 'next';
import client from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand } = req.query;
  if (!brand || typeof brand !== 'string') return res.status(400).json({ error: 'Missing brand' });

  const query = `
    *[_type == "brand" && name == $brand][0].models[]{
      name
      "slug": label,
    }
  `;
  try {
    const result = await client.fetch(query, { brand });
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load models' });
  }
}

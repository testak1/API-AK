import { NextApiRequest, NextApiResponse } from 'next';
import { client } from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const query = `*[_type == "brand"]{ name, "slug": slug.current, logo { "url": asset->url, alt } }`;
  try {
    const result = await client.fetch(query);
    res.status(200).json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load brands' });
  }
}

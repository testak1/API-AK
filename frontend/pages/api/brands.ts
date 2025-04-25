// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllBrandsWithDetails } from '@/lib/sanity';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const brands = await getAllBrandsWithDetails();
    res.status(200).json({ result: brands });
  } catch (error) {
    console.error('Error in /api/brands:', error);
    res.status(500).json({ error: 'Failed to load brands' });
  }
}

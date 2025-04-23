// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getAllBrandsWithDetails } from '.@/lib/sanity';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const brands = await getAllBrandsWithDetails();
    
    if (!brands || brands.length === 0) {
      return res.status(404).json({ message: 'No brands found' });
    }

    return res.status(200).json({ result: brands });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      message: 'Failed to fetch brands',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
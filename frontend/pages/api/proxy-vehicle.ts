// pages/api/proxy-vehicle.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reg } = req.query;

  if (!reg) return res.status(400).json({ error: 'Missing reg number' });

  try {
    const response = await fetch(`https://biluppgifter.se/fordon/${reg}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch from Biluppgifter');

    const html = await response.text();
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

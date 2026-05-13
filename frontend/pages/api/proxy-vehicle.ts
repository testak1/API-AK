// pages/api/proxy-vehicle.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reg } = req.query;

  if (!reg || typeof reg !== 'string') {
    return res.status(400).json({ error: 'Registreringsnummer saknas' });
  }

  try {
    const response = await axios.get(`https://biluppgifter.se/fordon/${reg}`, {
      headers: {
        // En mycket specifik User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Not A(Brand";v="99", "Google Chrome";v="121", "Chromium";v="121"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Referer': 'https://www.google.com/' // Vi låtsas komma från Google
      },
      timeout: 10000,
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(response.data);
  } catch (error: any) {
    console.error('Proxy Error:', error.response?.status || error.message);
    
    // Om vi fortfarande blir blockerade (403)
    if (error.response?.status === 403) {
      return res.status(403).json({ 
        error: 'Åtkomst nekad av Biluppgifter. De blockerar tyvärr server-anrop just nu.',
        status: 403 
      });
    }

    return res.status(500).json({ error: 'Kunde inte hämta fordonsdata' });
  }
}

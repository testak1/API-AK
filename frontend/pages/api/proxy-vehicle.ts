// pages/api/proxy-vehicle.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { reg } = req.query;

  if (!reg || typeof reg !== 'string') {
    return res.status(400).json({ error: 'Registreringsnummer saknas' });
  }

  try {
    // Vi använder Axios eftersom du redan har det installerat
    // Det hanterar headers och Timeouts stabilare i Node-miljöer
    const response = await axios.get(`https://biluppgifter.se/fordon/${reg}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 8000, // 8 sekunder timeout
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(response.data);
  } catch (error: any) {
    console.error('Proxy error details:', error.response?.status, error.message);
    
    // Om Biluppgifter blockerar eller inte hittar bilen
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: 'Kunde inte hämta data från Biluppgifter',
        status: error.response.status 
      });
    }
    
    return res.status(500).json({ error: 'Internt serverfel i proxyn' });
  }
}

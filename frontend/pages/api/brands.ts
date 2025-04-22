import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@sanity/client';

const client = createClient({
  projectId: 'wensahkh',  // Ensure this is correct
  dataset: 'production',  // Ensure this is correct
  apiVersion: '2023-01-01',
  useCdn: false,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const result = await client.fetch(`*[_type == "brand"]{
      name,
      models[]{
        name,
        years[]{
          range,
          engines[]{
            fuel,
            label,
            stages[]{
              name,
              origHk,
              tunedHk,
              origNm,
              tunedNm,
              price
            }
          }
        }
      }
    }`);

    console.log('Fetched data:', result);  // Log the result to ensure data is coming from Sanity

    res.status(200).json({ result });
  } catch (err) {
    console.error('Sanity fetch failed', err);  // Log the error to troubleshoot issues
    res.status(500).json({ error: 'Sanity fetch failed', details: err });
  }
}

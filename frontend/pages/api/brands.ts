import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  try {
    const result = await client.fetch(`
      *[_type == "brand"]{
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
                price,
                description
              }
            }
          }
        }
      }
    `)
    res.status(200).json({ result })
  } catch (err) {
    res.status(500).json({ 
      error: 'Sanity fetch failed',
      details: err instanceof Error ? err.message : String(err)
    })
  }
}
// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: process.env.NODE_ENV === 'production',
  token: process.env.SANITY_API_TOKEN
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const query = `*[_type == "brand"]{
      _id,
      name,
      "slug": slug.current,
      "models": models[]{
        name,
        "years": years[]{
          range,
          "engines": engines[]{
            fuel,
            label,
            "stages": stages[]{
              name,
              origHk,
              tunedHk,
              origNm,
              tunedNm,
              price,
              "description": descriptionRef->description,
              "aktPlusOptions": aktPlusOptions[]->{
                _id,
                title,
                description,
                "gallery": gallery[]{
                  _key,
                  "url": asset->url,
                  "alt": alt
                },
                price,
                installationTime,
                compatibilityNotes
              }
            }
          }
        }
      }
    }`

    const result = await client.fetch(query)
    
    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'No brands found' })
    }

    return res.status(200).json({ result })
  } catch (error) {
    console.error('Sanity fetch error:', error)
    return res.status(500).json({ 
      message: 'Failed to fetch brands',
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
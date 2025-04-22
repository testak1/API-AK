// pages/api/brands.ts
import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@sanity/client'

const client = createClient({
  projectId: 'wensahkh',
  dataset: 'production',
  apiVersion: '2023-01-01',
  useCdn: false,
})

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
    }`)
    res.status(200).json({ result })
  } catch (err) {
    res.status(500).json({ error: 'Sanity fetch failed', details: err })
  }
}

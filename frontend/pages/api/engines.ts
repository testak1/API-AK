// pages/api/engines.ts

import type { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { brand, model, year } = req.query;

  if (!brand || !model || !year) {
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  try {
    const query = `
      *[_type == "brand" && name == $brand][0]{
        models[name == $model][0]{
          years[range == $year][0]{
            "engines": engines[]{
              label,
              fuel,
              "slug": label,
              "stages": stages[]{
                name,
                origHk,
                tunedHk,
                origNm,
                tunedNm,
                price,
                type,
                description,
                descriptionRef->{
                  _id,
                  description
                }
              }
            }
          }
        }
      }
    `;

    const result = await client.fetch(query, { brand, model, year });
    const engines = result?.years?.engines || [];

    res.status(200).json({ result: engines });
  } catch (err) {
    console.error("Failed to fetch engines:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

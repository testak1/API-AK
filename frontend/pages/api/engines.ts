// pages/api/engines.ts
import { NextApiRequest, NextApiResponse } from "next";
import client from "@/lib/sanity";
import { createHash } from "crypto";

// ETag generator
function generateETag(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

// Cache in memory (simple solution for serverless environments)
const cache = new Map();
const CACHE_TTL = 3600 * 1000; // 1 hour in milliseconds

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const lang = (req.query.lang as string) || "sv";
  const { brand, model, year, resellerId } = req.query;

  if (!brand || !model || !year) {
    return res.status(400).json({ error: "Missing parameters" });
  }

  const cacheKey = `engines:${brand}:${model}:${year}:${lang}:${resellerId || "default"}`;

  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL) {
      // Check ETag for 304 Not Modified
      if (req.headers["if-none-match"] === cached.etag) {
        return res.status(304).end();
      }

      // Serve from cache
      res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
      res.setHeader("ETag", cached.etag);
      res.setHeader("Vary", "Accept-Encoding, Accept-Language");
      return res.status(200).json({ result: cached.data });
    }

    const query = `
    *[_type == "brand" && name == $brand][0]{
      models[name == $model][0]{
        years[range == $year][0]{
          engines[]{
            _id,
            _key,
            label,
            fuel,
            "slug": label,
            stages[]{
              name,
              "slug": name,
              type,
              tcuFields,
              origHk,
              tunedHk,
              origNm,
              tunedNm,
              price,
              "description": description[$lang],
              descriptionRef->{
                _id,
                stageName,
                "description": description[$lang]
              },
              // Dynamic scoped aktPlusOptions
              "aktPlusOptions": *[_type == "aktPlus" &&
                (
                  isUniversal == true ||
                  ^.^.fuel in applicableFuelTypes
                ) &&
                (
                  !defined(stageCompatibility) ||
                  stageCompatibility == ^.name
                )
              ]{
                _id,
                title,
                price,
                isUniversal,
                applicableFuelTypes,
                stageCompatibility,
                compatibilityNotes,
                description,
                gallery[]{
                  _key,
                  alt,
                  caption,
                  "asset": asset->{
                    _id,
                    url
                  }
                }
              }
            },
            // Dynamic global aktPlusOptions
            "globalAktPlusOptions": *[_type == "aktPlus" &&
              (
                isUniversal == true ||
                ^.fuel in applicableFuelTypes
              ) &&
              !defined(stageCompatibility)
            ]{
              _id,
              title,
              price,
              isUniversal,
              applicableFuelTypes,
              stageCompatibility,
              compatibilityNotes,
              description,
              gallery[]{
                _key,
                alt,
                caption,
                "asset": asset->{
                  _id,
                  url
                }
              }
            }
          }
        }
      }
    }.models.years.engines
  `;

    const result = await client.fetch(query, { brand, model, year, lang });

    if (!Array.isArray(result)) {
      return res.status(200).json({ result: [] });
    }

    if (resellerId) {
      const overrides = await client.fetch(
        `*[_type == "resellerOverride" && resellerId == $resellerId]`,
        { resellerId },
      );

      const overrideMap = new Map();
      for (const o of overrides) {
        const key = `${o.brand}|${o.model}|${o.year}|${o.engine}|${o.stageName}`;
        overrideMap.set(key, o);
      }

      result.forEach((engine) => {
        engine.stages = engine.stages.map((stage) => {
          const key = `${brand}|${model}|${year}|${engine.label}|${stage.name}`;
          const override = overrideMap.get(key);
          return override
            ? {
                ...stage,
                price: override.price,
                tunedHk: override.tunedHk,
                tunedNm: override.tunedNm,
              }
            : stage;
        });
      });
    }

    // Generate ETag
    const etag = generateETag(JSON.stringify(result));

    // Update cache
    cache.set(cacheKey, {
      data: result,
      etag,
      timestamp: now,
    });

    // Set headers
    res.setHeader("Cache-Control", "public, max-age=3600, must-revalidate");
    res.setHeader("ETag", etag);
    res.setHeader("Vary", "Accept-Encoding, Accept-Language");

    return res.status(200).json({ result });
  } catch (error) {
    console.error("Engine API Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

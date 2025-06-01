import {NextApiRequest, NextApiResponse} from "next";
import client from "@/lib/sanity";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const lang = (req.query.lang as string) || "sv";
  const {brand, model, year, resellerId} = req.query;

  if (!brand || !model || !year) {
    return res.status(400).json({error: "Missing parameters"});
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

  try {
    const result = await client.fetch(query, {brand, model, year, lang});

    if (!Array.isArray(result)) {
      return res.status(200).json({result: []});
    }

    if (resellerId) {
      const overrides = await client.fetch(
        `*[_type == "resellerOverride" && resellerId == $resellerId]`,
        {resellerId}
      );

      const overrideMap = new Map();
      for (const o of overrides) {
        const key = `${o.brand}|${o.model}|${o.year}|${o.engine}|${o.stageName}`;
        overrideMap.set(key, o);
      }

      result.forEach(engine => {
        engine.stages = engine.stages.map(stage => {
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

    res.status(200).json({result});
  } catch (error) {
    console.error("Error fetching engines with overrides:", error);
    res.status(500).json({error: "Failed to load engines"});
  }
}

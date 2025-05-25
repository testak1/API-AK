import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const resellerIdFromSession = session?.user?.resellerId;
    const resellerIdFromQuery = req.query.resellerId;
    const resellerId = resellerIdFromSession || resellerIdFromQuery;

    if (!resellerId) {
      return res.status(400).json({ error: "Missing resellerId" });
    }

    const [baseBrands, overrides] = await Promise.all([
      sanity.fetch(`*[_type == "brand"]{
        name,
        slug,
        logo,
        models[]{
          name,
          slug,
          years[]{
            range,
            engines[]{
              label,
              fuel,
              globalAktPlusOptions,
              stages[]{
                name,
                price,
                tunedHk,
                tunedNm,
                origHk,
                origNm,
                type,
                tcuFields,
                aktPlusOptions,
                descriptionRef
              }
            }
          }
        }
      }`),
      sanity.fetch(
        `*[_type == "resellerOverride" && resellerId == $resellerId]{
          _id,
          brand,
          model,
          year,
          engine,
          stageName,
          price,
          tunedHk,
          tunedNm,
          resellerId
        }`,
        { resellerId },
      ),
    ]);

    // Process brands with possible overrides (specific or bulk)
    const brands = (baseBrands || []).map((brand) => ({
      ...brand,
      models: (brand.models || []).map((model) => ({
        ...model,
        years: (model.years || []).map((year) => ({
          ...year,
          engines: (year.engines || []).map((engine) => ({
            ...engine,
            stages: (engine.stages || []).map((stage) => {
              // Match order: exact > bulk model > bulk year
              const exactMatch = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  o.model === model.name &&
                  o.year === year.range &&
                  o.engine === engine.label &&
                  o.stageName === stage.name,
              );

              const modelLevelMatch = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  o.model === model.name &&
                  !o.year &&
                  !o.engine &&
                  o.stageName === stage.name,
              );

              const yearLevelMatch = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  !o.model &&
                  o.year === year.range &&
                  !o.engine &&
                  o.stageName === stage.name,
              );

              const match = exactMatch || modelLevelMatch || yearLevelMatch;

              return match
                ? {
                    ...stage,
                    price: match.price,
                    tunedHk: match.tunedHk ?? stage.tunedHk,
                    tunedNm: match.tunedNm ?? stage.tunedNm,
                  }
                : stage;
            }),
          })),
        })),
      })),
    }));

    return res.status(200).json({ brands, overrides });
  } catch (err) {
    console.error("Error in /api/brands-with-overrides:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

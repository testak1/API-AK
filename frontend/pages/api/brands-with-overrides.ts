// pages/api/brands-with-overrides.ts
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
          resellerId,
        }`,
        { resellerId },
      ),
    ]);

    // Process brands with overrides
    const brands = (baseBrands || []).map((brand) => ({
      ...brand,
      models: (brand.models || []).map((model) => ({
        ...model,
        years: (model.years || []).map((year) => ({
          ...year,
          engines: (year.engines || []).map((engine) => ({
            ...engine,
            stages: (engine.stages || []).map((stage) => {
              // Priority order for overrides:
              // 1. Exact match (brand+model+year+engine)
              // 2. Model-level bulk (brand+model)
              // 3. Year-level bulk (brand+year)

              const exact = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  o.model === model.name &&
                  o.year === year.range &&
                  o.engine === engine.label &&
                  o.stageName === stage.name,
              );

              const modelLevel = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  o.model === model.name &&
                  !o.year &&
                  !o.engine &&
                  o.stageName === stage.name,
              );

              const yearLevel = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  o.year === year.range &&
                  !o.model &&
                  !o.engine &&
                  o.stageName === stage.name,
              );

              const override = exact || modelLevel || yearLevel;

              return override
                ? {
                    ...stage,
                    price: override.price ?? stage.price,
                    tunedHk: override.tunedHk ?? stage.tunedHk,
                    tunedNm: override.tunedNm ?? stage.tunedNm,
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

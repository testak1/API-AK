import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  try {
    const session = await getServerSession(req, res, authOptions);
    const resellerId = session?.user?.resellerId;

    if (!resellerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Fetch both brands and overrides
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
        `*[_type == "resellerOverride" && resellerId == $resellerId]`,
        { resellerId },
      ),
    ]);

    // Build override map
    const overrideMap = new Map();
    for (const override of overrides) {
      const key = `${override.brand}|${override.model}|${override.year}|${override.engine}|${override.stageName}`;
      overrideMap.set(key, override);
    }

    // Merge overrides into brand data
    const brands = (baseBrands || []).map((brand) => ({
      ...brand,
      models: (brand.models || []).map((model) => ({
        ...model,
        years: (model.years || []).map((year) => ({
          ...year,
          engines: (year.engines || []).map((engine) => ({
            ...engine,
            stages: (engine.stages || []).map((stage) => {
              const key = `${brand.name}|${model.name}|${year.range}|${engine.label}|${stage.name}`;
              const override = overrideMap.get(key);

              return override
                ? {
                    ...stage,
                    price: override.price,
                    tunedHk: override.tunedHk,
                    tunedNm: override.tunedNm,
                  }
                : stage;
            }),
          })),
        })),
      })),
    }));

    return res.status(200).json({ brands });
  } catch (err) {
    console.error("Error in /api/brands-with-overrides:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

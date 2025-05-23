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
        `*[_type == "resellerOverride" && resellerId == $resellerId]`,
        { resellerId },
      ),
    ]);

    const overrideMap = new Map();
    for (const o of overrides) {
      const key = `${o.brand.trim()}|${o.model.trim()}|${o.year.trim()}|${o.engine.trim()}|${o.stageName.trim()}`;
      overrideMap.set(key, o);
    }

    const brands = (baseBrands || []).map((brand) => ({
      ...brand,
      models: (brand.models || []).map((model) => ({
        ...model,
        years: (model.years || []).map((year) => ({
          ...year,
          engines: (year.engines || []).map((engine) => ({
            ...engine,
            stages: (engine.stages || []).map((stage) => {
              const key = `${brand.name.trim()}|${model.name.trim()}|${year.range.trim()}|${engine.label.trim()}|${stage.name.trim()}`;
              const override = overrideMap.get(key);

              if (!override && process.env.NODE_ENV !== "production") {
                console.warn("No override for key:", key);
              }

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

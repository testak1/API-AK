// pages/api/brands-with-overrides.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // Fetch base brand data and overrides in parallel
  const [baseBrands, overrides] = await Promise.all([
    sanity.fetch(`*[_type == "brand"]{
      name,
      models[]{
        name,
        years[]{
          range,
          engines[]{
            label,
            fuel,
            stages[]{ name, price, tunedHk, tunedNm }
          }
        }
      }
    }`),
    sanity.fetch(
      `*[_type == "resellerOverride" && resellerId == $resellerId]`,
      { resellerId },
    ),
  ]);

  // Index overrides by a composite key for fast lookup
  const overrideMap = new Map();
  for (const o of overrides) {
    const key = `${o.brand}|${o.model}|${o.year}|${o.engine}|${o.stageName}`;
    overrideMap.set(key, o);
  }

  // Apply overrides
  const brands = baseBrands.map((brand) => ({
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

  console.log(
    `Overrides applied for reseller: ${resellerId}, total: ${overrideMap.size}`,
  );
  return res.status(200).json({ brands });
}

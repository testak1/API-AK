import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

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

  // Apply overrides
  const brands = baseBrands.map((brand) => ({
    ...brand,
    models: brand.models.map((model) => ({
      ...model,
      years: model.years.map((year) => ({
        ...year,
        engines: year.engines.map((engine) => ({
          ...engine,
          stages: engine.stages.map((stage) => {
            const override = overrides.find(
              (o) =>
                o.brand === brand.name &&
                o.model === model.name &&
                o.year === year.range &&
                o.engine === engine.label &&
                o.stageName === stage.name,
            );
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
}

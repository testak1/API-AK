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

    const [baseBrands, overrides, globalDescriptions] = await Promise.all([
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
                description,
                descriptionRef->{
                  description
                }
              }
            }
          }
        }
      }`),
      sanity.fetch(
        `*[_type == "resellerOverride" && resellerId == $resellerId && !isGlobalDescription]{
          _id,
          brand,
          model,
          year,
          engine,
          stageName,
          price,
          tunedHk,
          tunedNm,
          stageDescription,
          resellerId
        }`,
        { resellerId },
      ),
      sanity.fetch(
        `*[_type == "resellerOverride" && resellerId == $resellerId && isGlobalDescription == true]{
          _id,
          stageName,
          stageDescription,
          resellerId
        }`,
        { resellerId },
      ),
    ]);

    const isEmpty = (v) => v === undefined || v === null || v === "";

    // Create a map of global descriptions by stage name
    const globalDescriptionsMap = (globalDescriptions || []).reduce(
      (acc, desc) => {
        acc[desc.stageName] = desc.stageDescription;
        return acc;
      },
      {},
    );

    const brands = (baseBrands || []).map((brand) => ({
      ...brand,
      models: (brand.models || []).map((model) => ({
        ...model,
        years: (model.years || []).map((year) => ({
          ...year,
          engines: (year.engines || []).map((engine) => ({
            ...engine,
            stages: (engine.stages || []).map((stage) => {
              // Find matching override
              const matchingOverride = overrides.find(
                (o) =>
                  o.brand === brand.name &&
                  (isEmpty(o.model) || o.model === model.name) &&
                  (isEmpty(o.year) || o.year === year.range) &&
                  (isEmpty(o.engine) || o.engine === engine.label) &&
                  o.stageName === stage.name,
              );

              return {
                ...stage,
                // Apply overrides if they exist
                ...(matchingOverride
                  ? {
                      price: matchingOverride.price,
                      tunedHk: matchingOverride.tunedHk ?? stage.tunedHk,
                      tunedNm: matchingOverride.tunedNm ?? stage.tunedNm,
                      description:
                        matchingOverride.stageDescription ??
                        stage.description ??
                        stage.descriptionRef?.description ??
                        globalDescriptionsMap[stage.name],
                    }
                  : {
                      description:
                        stage.description ??
                        stage.descriptionRef?.description ??
                        globalDescriptionsMap[stage.name],
                    }),
              };
            }),
          })),
        })),
      })),
    }));

    return res.status(200).json({
      brands,
      overrides,
      globalDescriptions: globalDescriptionsMap,
    });
  } catch (err) {
    console.error("Error in /api/brands-with-overrides:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

// Helper function to normalize strings for comparison
const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<EnginePageProps> = async (
  context
) => {
  // Decode all URL parameters
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  try {
    // Fetch brand data with case-insensitive slug matching
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return { notFound: true };

    // Find model using normalized comparison
    const modelData =
      brandData.models?.find(
        (m: Model) =>
          normalizeString(m.name) === normalizeString(model) ||
          (m.slug &&
            normalizeString(
              typeof m.slug === "string" ? m.slug : m.slug.current
            ) === normalizeString(model))
      ) || null;

    if (!modelData) return { notFound: true };

    // Find year using normalized comparison
    const yearData =
      modelData.years?.find(
        (y: Year) =>
          normalizeString(y.range) === normalizeString(year) ||
          (y.slug && normalizeString(y.slug) === normalizeString(year))
      ) || null;

    if (!yearData) return { notFound: true };

    // Find engine using normalized comparison
    const engineData =
      yearData.engines?.find(
        (e: Engine) =>
          normalizeString(e.label) === normalizeString(engine) ||
          (e.slug && normalizeString(e.slug) === normalizeString(engine))
      ) || null;

    if (!engineData) return { notFound: true };

    return {
      props: {
        brandData,
        modelData,
        yearData,
        engineData,
      },
    };
  } catch (err) {
    console.error("Engine fetch failed:", err);
    return { notFound: true };
  }
};

export default function EnginePage({
  brandData,
  modelData,
  yearData,
  engineData,
}: EnginePageProps) {
  const router = useRouter();

  if (!engineData) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine}
        </h1>
        <p className="text-lg text-red-500">Motorinformation saknas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {brandData?.name} / {modelData?.name} / {yearData?.range} /{" "}
        {engineData.label}
      </h1>

      <div className="mb-6">
        <p className="text-lg font-medium">Modell: {modelData?.name}</p>
        <p className="text-lg">År: {yearData?.range}</p>
        <p className="text-lg">
          Motor: {engineData.label} ({engineData.fuel})
        </p>
      </div>

      <div className="space-y-4">
        {engineData.stages?.map((stage: Stage) => (
          <div
            key={stage.name}
            className="border border-gray-200 rounded-lg p-4"
          >
            <h2 className="text-xl font-semibold mb-2">{stage.name}</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-medium">Effekt (HK):</p>
                <p>
                  <span className="text-gray-600">Original: </span>
                  {stage.origHk} →
                  <span className="text-green-600 font-semibold">
                    {" "}
                    Tuned: {stage.tunedHk}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-medium">Vridmoment (Nm):</p>
                <p>
                  <span className="text-gray-600">Original: </span>
                  {stage.origNm} →
                  <span className="text-green-600 font-semibold">
                    {" "}
                    Tuned: {stage.tunedNm}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

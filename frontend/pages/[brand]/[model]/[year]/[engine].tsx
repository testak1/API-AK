// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<EnginePageProps> = async (
  context
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  try {
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return { notFound: true };

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

    const yearData =
      modelData.years?.find(
        (y: Year) =>
          normalizeString(y.range) === normalizeString(year) ||
          (y.slug && normalizeString(y.slug) === normalizeString(year))
      ) || null;

    if (!yearData) return { notFound: true };

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
    <div className="max-w-7xl mx-auto p-4">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {brandData?.name} {modelData?.name}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-lg">
          <span className="bg-gray-700 px-3 py-1 rounded-full">
            {yearData?.range}
          </span>
          <span className="bg-indigo-600 px-3 py-1 rounded-full">
            {engineData.label}
          </span>
          <span className="bg-amber-500 text-black px-3 py-1 rounded-full">
            {engineData.fuel}
          </span>
        </div>
      </div>

      {/* Performance Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
        {engineData.stages?.map((stage) => (
          <div
            key={stage.name}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700"
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-indigo-400">
                {stage.name}
              </h3>
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                {stage.price?.toLocaleString()} kr
              </span>
            </div>

            {/* Performance Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-1">
                  <span>Hästkrafter</span>
                  <span className="font-mono">
                    {stage.origHk} →{" "}
                    <span className="text-green-400">{stage.tunedHk}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-green-500"
                    style={{
                      width: `${(stage.tunedHk / (stage.tunedHk + 100)) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span>Vridmoment</span>
                  <span className="font-mono">
                    {stage.origNm} →{" "}
                    <span className="text-green-400">{stage.tunedNm}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                    style={{
                      width: `${(stage.tunedNm / (stage.tunedNm + 100)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3 mt-6">
              <div className="bg-gray-900 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-400">Ökning</p>
                <p className="text-xl font-bold text-green-400">
                  +{stage.tunedHk - stage.origHk} hk
                </p>
              </div>
              <div className="bg-gray-900 p-3 rounded-lg text-center">
                <p className="text-sm text-gray-400">Ökning</p>
                <p className="text-xl font-bold text-cyan-400">
                  +{stage.tunedNm - stage.origNm} Nm
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed Stage Comparison */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-5 bg-gray-900 p-4 font-bold">
          <div className="col-span-2">Specifikation</div>
          <div className="text-center">Original</div>
          <div className="text-center">Tuned</div>
          <div className="text-center">Skillnad</div>
        </div>
        {engineData.stages?.map((stage) => (
          <>
            <div className="grid grid-cols-5 p-4 border-b border-gray-700 items-center">
              <div className="col-span-2 font-medium">{stage.name}</div>
              <div className="text-center">{stage.origHk} hk</div>
              <div className="text-center text-green-400">
                {stage.tunedHk} hk
              </div>
              <div className="text-center text-green-400">
                +{stage.tunedHk - stage.origHk} hk
              </div>
            </div>
            <div className="grid grid-cols-5 p-4 border-b border-gray-700 items-center">
              <div className="col-span-2"></div>
              <div className="text-center">{stage.origNm} Nm</div>
              <div className="text-center text-cyan-400">
                {stage.tunedNm} Nm
              </div>
              <div className="text-center text-cyan-400">
                +{stage.tunedNm - stage.origNm} Nm
              </div>
            </div>
          </>
        ))}
      </div>
    </div>
  );
}

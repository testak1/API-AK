// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import Head from "next/head";

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

const portableTextComponents = {
  types: {
    image: ({ value }: any) => (
      <img
        src={urlFor(value).width(100).url()}
        alt={value.alt || ""}
        className="my-4 rounded-lg shadow-md"
      />
    ),
  },
};

const PerformanceBar = ({
  original,
  tuned,
  max,
  color,
  unit,
}: {
  original: number;
  tuned: number;
  max: number;
  color: string;
  unit: string;
}) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-gray-400">
          Original: {original} {unit}
        </span>
        <span className={`text-${color}`}>
          Tuned: {tuned} {unit} (+{tuned - original})
        </span>
      </div>
      <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-gray-600 to-${color}`}
          style={{
            width: `${(tuned / max) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
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

  // Calculate max values for scaling
  const maxHp = Math.max(
    ...(engineData.stages?.map((s) => s.tunedHk) || []),
    ...(engineData.stages?.map((s) => s.origHk) || [])
  );
  const maxNm = Math.max(
    ...(engineData.stages?.map((s) => s.tunedNm) || []),
    ...(engineData.stages?.map((s) => s.origNm) || [])
  );

  return (
    <>
      <Head>
        <title>
          {brandData?.name} {modelData?.name} {engineData.label} | AK-Tuning
        </title>
      </Head>

      <div className="min-h-screen bg-gray-900 text-white">
        {/* Racing Header */}
        <div className="bg-black py-12 px-4 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/30 to-black/70"></div>
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {brandData?.logo?.asset && (
                <img
                  src={urlFor(brandData.logo).width(160).url()}
                  alt={brandData.name}
                  className="h-24 w-auto"
                />
              )}
              <div>
                <h1 className="text-4xl font-bold mb-2">
                  {brandData?.name}{" "}
                  <span className="text-red-500">{modelData?.name}</span>
                </h1>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-gray-800 px-3 py-1 rounded-full">
                    {yearData?.range}
                  </span>
                  <span className="bg-red-600 px-3 py-1 rounded-full">
                    {engineData.label}
                  </span>
                  <span className="bg-yellow-500 text-black px-3 py-1 rounded-full">
                    {engineData.fuel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stage Cards */}
        <div className="max-w-6xl mx-auto py-12 px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {engineData.stages?.map((stage) => (
              <div
                key={stage.name}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden transform hover:scale-[1.02] transition-transform duration-300"
              >
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 border-b border-gray-700">
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold">
                      <span className="text-red-500">{stage.name}</span>
                    </h2>
                    <span className="bg-red-600 text-white px-4 py-1 rounded-full text-lg font-bold">
                      {stage.price?.toLocaleString()} kr
                    </span>
                  </div>
                </div>

                <div className="p-6">
                  <PerformanceBar
                    original={stage.origHk}
                    tuned={stage.tunedHk}
                    max={maxHp}
                    color="red-500"
                    unit="hk"
                  />
                  <PerformanceBar
                    original={stage.origNm}
                    tuned={stage.tunedNm}
                    max={maxNm}
                    color="yellow-500"
                    unit="Nm"
                  />

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="bg-gray-900 p-4 rounded-lg">
                      <h3 className="text-lg font-bold mb-2 text-red-400">
                        Original
                      </h3>
                      <p>{stage.origHk} hk</p>
                      <p>{stage.origNm} Nm</p>
                    </div>
                    <div className="bg-gray-900 p-4 rounded-lg border border-red-500/30">
                      <h3 className="text-lg font-bold mb-2 text-green-400">
                        Efter tuning
                      </h3>
                      <p className="text-green-400">{stage.tunedHk} hk</p>
                      <p className="text-yellow-400">{stage.tunedNm} Nm</p>
                    </div>
                  </div>

                  <button className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold text-lg transition-colors duration-300">
                    BOKA {stage.name.toUpperCase()}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-black py-8 text-center text-gray-400">
          <p>AK-Tuning Performance Solutions</p>
        </div>
      </div>
    </>
  );
}

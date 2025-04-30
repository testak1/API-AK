// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import { useState } from "react";
import { motion } from "framer-motion";
import { PortableText } from "@portabletext/react";

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

export default function EnginePage({
  brandData,
  modelData,
  yearData,
  engineData,
}: EnginePageProps) {
  const router = useRouter();
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});

  const toggleFlip = (stageName: string) => {
    setFlippedCards((prev) => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

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
    <div className="max-w-5xl mx-auto p-4">
      {/* Vehicle Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-2">
          {brandData?.name}{" "}
          <span className="text-indigo-400">{modelData?.name}</span>
        </h1>
        <div className="flex justify-center gap-4">
          <span className="bg-gray-800 px-3 py-1 rounded-full">
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

      {/* Stage Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {engineData.stages?.map((stage) => (
          <div key={stage.name} className="perspective-1000 h-96">
            <motion.div
              className="relative w-full h-full transition-transform duration-500 transform-style-preserve-3d"
              animate={{ rotateY: flippedCards[stage.name] ? 180 : 0 }}
              onClick={() => toggleFlip(stage.name)}
            >
              {/* Front Side */}
              <div className="absolute w-full h-full bg-gray-800 rounded-xl p-6 backface-hidden flex flex-col border-2 border-indigo-500/30">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-bold text-indigo-400">
                    {stage.name}
                  </h3>
                  <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                    {stage.price?.toLocaleString()} kr
                  </span>
                </div>

                <div className="flex-1 grid place-items-center">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-green-400 mb-2">
                      +{stage.tunedHk - stage.origHk} hk
                    </div>
                    <p className="text-gray-400">
                      {stage.origHk} →{" "}
                      <span className="text-white font-bold">
                        {stage.tunedHk} hk
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex justify-between mt-auto pt-4 border-t border-gray-700">
                  <div>
                    <p className="text-sm text-gray-400">Vridmoment</p>
                    <p>
                      {stage.origNm} →{" "}
                      <span className="text-cyan-400">{stage.tunedNm} Nm</span>
                    </p>
                  </div>
                  <button className="text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                    Mer info ↓
                  </button>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute w-full h-full bg-gray-800 rounded-xl p-6 backface-hidden transform-rotate-y-180 overflow-y-auto border-2 border-indigo-500/30">
                <button
                  className="absolute top-4 right-4 text-indigo-400 hover:text-indigo-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFlip(stage.name);
                  }}
                >
                  ✕
                </button>

                <h3 className="text-xl font-bold mb-4">{stage.name}</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-gray-900 p-3 rounded-lg">
                    <p className="text-sm text-gray-400">Original</p>
                    <p className="text-lg">{stage.origHk} hk</p>
                    <p className="text-lg">{stage.origNm} Nm</p>
                  </div>
                  <div className="bg-gray-900 p-3 rounded-lg border border-green-500/30">
                    <p className="text-sm text-gray-400">Efter tuning</p>
                    <p className="text-lg text-green-400">{stage.tunedHk} hk</p>
                    <p className="text-lg text-cyan-400">{stage.tunedNm} Nm</p>
                  </div>
                </div>

                {stage.descriptionRef?.description && (
                  <div className="prose prose-invert text-sm">
                    <PortableText
                      value={stage.descriptionRef.description}
                      components={portableTextComponents}
                    />
                  </div>
                )}

                <button className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg font-medium">
                  Kontakta oss
                </button>
              </div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

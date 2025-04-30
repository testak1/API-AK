// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import Head from "next/head";
import React, { useEffect, useState, useRef, useMemo } from "react";
import ContactModal from "@/components/ContactModal";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
);

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
        src={urlFor(value).width(600).url()}
        alt={value.alt || ""}
        className="my-4 rounded-lg shadow-md"
      />
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a
        href={value.href}
        className="text-blue-400 hover:text-blue-300 underline"
      >
        {children}
      </a>
    ),
  },
};

const generateDynoCurve = (peakValue: number, isHp: boolean) => {
  const rpmRange = [
    2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000,
  ];
  const peakIndex = isHp ? 6 : 4;
  const startIndex = 0;

  return rpmRange.map((rpm, i) => {
    const startRpm = rpmRange[startIndex];
    const peakRpm = rpmRange[peakIndex];
    const endRpm = rpmRange[rpmRange.length - 1];

    if (rpm <= peakRpm) {
      const progress = (rpm - startRpm) / (peakRpm - startRpm);
      return peakValue * (0.5 + 0.5 * Math.pow(progress, 1.2));
    } else {
      const fallProgress = (rpm - peakRpm) / (endRpm - peakRpm);
      return peakValue * (1 - 0.35 * Math.pow(fallProgress, 1));
    }
  });
};

export default function EnginePage({
  brandData,
  modelData,
  yearData,
  engineData,
}: EnginePageProps) {
  const router = useRouter();
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [contactModalData, setContactModalData] = useState<{
    isOpen: boolean;
    stageOrOption: string;
    link: string;
  }>({ isOpen: false, stageOrOption: "", link: "" });

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const handleBookNow = (stageOrOptionName: string) => {
    const brandSlug =
      brandData?.slug?.current || slugify(brandData?.name || "");
    const modelSlug =
      typeof modelData?.slug === "object"
        ? modelData.slug.current
        : modelData?.slug || slugify(modelData?.name || "");
    const yearSlug = yearData?.range.includes(" ")
      ? slugify(yearData.range)
      : yearData?.range || "";
    const engineSlug = engineData?.label.includes(" ")
      ? slugify(engineData.label)
      : engineData?.label || "";
    const stageSlug = slugify(
      stageOrOptionName.replace(/\s+/g, "-").replace(/[^\w-]/g, "")
    );

    const finalLink = `https://api.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}#${stageSlug}`;

    setContactModalData({
      isOpen: true,
      stageOrOption: stageOrOptionName,
      link: finalLink,
    });
  };

  useEffect(() => {
    if (engineData?.stages) {
      const initialExpandedStates = engineData.stages.reduce(
        (acc, stage) => {
          acc[stage.name] = stage.name === "Steg 1";
          return acc;
        },
        {} as Record<string, boolean>
      );
      setExpandedStages(initialExpandedStates);
    }
  }, [engineData]);

  const toggleStage = (stageName: string) => {
    setExpandedStages((prev) => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = key === stageName ? !prev[key] : false;
      });
      return newState;
    });
  };

  const renderStageDescription = (stage: Stage) => {
    const description = stage.descriptionRef?.description || stage.description;
    const isExpanded = expandedDescriptions[stage.name] ?? false;

    if (!description) return null;

    return (
      <div className="mt-4 mb-6 border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() =>
            setExpandedDescriptions((prev) => ({
              ...prev,
              [stage.name]: !prev[stage.name],
            }))
          }
          className="w-full px-4 py-3 bg-gray-700 hover:bg-gray-600 flex items-center justify-between text-left transition-colors"
        >
          <span className="text-white font-semibold text-sm sm:text-base">
            STEG {stage.name.replace(/\D/g, "")} INFORMATION
          </span>
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800">
            <svg
              className={`h-5 w-5 text-orange-500 transition-transform duration-300 ${
                isExpanded ? "rotate-180" : ""
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </button>

        {isExpanded && (
          <div className="prose prose-invert max-w-none p-4 bg-gray-800">
            {typeof description === "string" ? (
              <p>{description}</p>
            ) : (
              <PortableText
                value={description}
                components={portableTextComponents}
              />
            )}
          </div>
        )}
      </div>
    );
  };

  if (!engineData) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine}
        </h1>
        <p className="text-lg text-red-500">Motorinformation saknas.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center mb-4">
        <img
          src="/ak-logo-svart.png"
          alt="AK-TUNING"
          style={{ height: "80px", cursor: "pointer" }}
          className="h-12 object-contain"
          onClick={() => window.location.reload()}
        />
      </div>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-center">
          {brandData?.name} {modelData?.name} {yearData?.range}
        </h1>
        <p className="text-lg text-center text-gray-300">
          {engineData.label} ({engineData.fuel})
        </p>
      </div>

      {engineData.stages?.length > 0 ? (
        <div className="space-y-6">
          {engineData.stages.map((stage) => {
            const isExpanded = expandedStages[stage.name] ?? false;

            return (
              <div
                key={stage.name}
                className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden"
              >
                <button
                  onClick={() => toggleStage(stage.name)}
                  className="w-full p-6 text-left hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      {brandData?.logo?.asset && (
                        <img
                          src={urlFor(brandData.logo).width(60).url()}
                          alt={brandData.name}
                          className="h-8 w-auto object-contain"
                        />
                      )}
                      <h2 className="text-lg font-semibold text-white">
                        {engineData.label} –{" "}
                        <span className="text-indigo-400 uppercase tracking-wide">
                          {stage.name}
                        </span>
                      </h2>
                    </div>

                    <div className="mt-3 md:mt-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-center">
                      <img
                        src={`/badges/${stage.name.toLowerCase().replace(/\s+/g, "")}.png`}
                        alt={stage.name}
                        className="h-8 object-contain"
                      />
                      <span className="inline-block bg-red-600 text-black px-4 py-1 rounded-full text-xl font-semibold shadow-md">
                        {stage.price?.toLocaleString()} kr
                      </span>
                      {(stage.name.includes("Steg 2") ||
                        stage.name.includes("Steg 3") ||
                        stage.name.includes("Steg 4")) && (
                        <p className="text-xs text-gray-400 mt-2 italic">
                          Priset omfattar enbart mjukvaran.
                          <br />
                          Kontakta oss för offert inkl hårdvara!
                        </p>
                      )}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 hover:scale-110 transform transition-all duration-300">
                        <svg
                          className={`h-6 w-6 text-orange-500 transform transition-transform duration-300 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-6 pb-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
                      <div className="border border-white rounded-lg p-3 text-center">
                        <p className="text-sm text-white font-bold mb-1">
                          ORIGINAL HK
                        </p>
                        <p className="text-xl text-white font-bold">
                          {stage.origHk} hk
                        </p>
                      </div>
                      <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                        <p className="text-xl text-white font-bold mb-1 uppercase">
                          {stage.name} HK
                        </p>
                        <p className="text-xl font-bold">{stage.tunedHk} hk</p>
                        <p className="text-xs mt-1 text-red-400">
                          +{stage.tunedHk - stage.origHk} hk
                        </p>
                      </div>
                      <div className="border border-white rounded-lg p-3 text-center">
                        <p className="text-sm text-white font-bold mb-1">
                          ORIGINAL NM
                        </p>
                        <p className="text-xl text-white font-bold">
                          {stage.origNm} Nm
                        </p>
                      </div>
                      <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                        <p className="text-xl text-white font-bold mb-1 uppercase">
                          {stage.name} NM
                        </p>
                        <p className="text-xl font-bold">{stage.tunedNm} Nm</p>
                        <p className="text-xs mt-1 text-red-400">
                          +{stage.tunedNm - stage.origNm} Nm
                        </p>
                      </div>
                    </div>
                    {renderStageDescription(stage)}

                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                        {stage.name}
                      </h3>

                      <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                        <div className="absolute hidden md:flex flex-row justify-between top-4 left-0 right-0 px-16">
                          <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                            <p className="text-red-400">- - -</p>
                            <p className="text-white">
                              HK ORG: {stage.origHk} hk
                            </p>
                            <p className="text-red-800">⸻</p>
                            <p className="text-white">
                              HK{" "}
                              {stage.name
                                .replace("Steg", "ST")
                                .replace(/\s+/g, "")
                                .toUpperCase()}
                              : {stage.tunedHk} HK
                            </p>
                          </div>

                          <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                            <p className="text-white">- - -</p>
                            <p className="text-white">
                              NM ORG: {stage.origNm} Nm
                            </p>
                            <p className="text-white">⸻</p>
                            <p className="text-white">
                              <span className="text-gray-400 text-xs mr-1">
                                NM
                              </span>
                              {stage.name
                                .replace("Steg", "ST")
                                .replace(/\s+/g, "")
                                .toUpperCase()}
                              : {stage.tunedNm} Nm
                            </p>
                          </div>
                        </div>

                        <Line
                          data={{
                            labels: [
                              "2000",
                              "2500",
                              "3000",
                              "3500",
                              "4000",
                              "4500",
                              "5000",
                              "5500",
                              "6000",
                              "6500",
                              "7000",
                            ],
                            datasets: [
                              {
                                label: "Original HK",
                                data: generateDynoCurve(stage.origHk, true),
                                borderColor: "#f87171",
                                backgroundColor: "transparent",
                                borderWidth: 2,
                                borderDash: [5, 3],
                                tension: 0.5,
                                pointRadius: 0,
                              },
                              {
                                label: "Tuned HK",
                                data: generateDynoCurve(stage.tunedHk, true),
                                borderColor: "#f87171",
                                backgroundColor: "transparent",
                                borderWidth: 3,
                                tension: 0.5,
                                pointRadius: 0,
                              },
                              {
                                label: "Original NM",
                                data: generateDynoCurve(stage.origNm, false),
                                borderColor: "#d1d5db",
                                backgroundColor: "transparent",
                                borderWidth: 2,
                                borderDash: [5, 3],
                                tension: 0.5,
                                pointRadius: 0,
                              },
                              {
                                label: "Tuned NM",
                                data: generateDynoCurve(stage.tunedNm, false),
                                borderColor: "#d1d5db",
                                backgroundColor: "transparent",
                                borderWidth: 3,
                                tension: 0.5,
                                pointRadius: 0,
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: "top",
                                labels: {
                                  color: "#E5E7EB",
                                  font: { size: 12 },
                                  boxWidth: 12,
                                  padding: 20,
                                  usePointStyle: true,
                                },
                              },
                              tooltip: {
                                mode: "index",
                                intersect: false,
                              },
                            },
                            scales: {
                              y: {
                                type: "linear",
                                display: true,
                                position: "left",
                                title: {
                                  display: true,
                                  text: "Effekt (HK)",
                                  color: "white",
                                  font: { size: 14 },
                                },
                                min: 0,
                                max: Math.ceil(stage.tunedHk / 100) * 100 + 100,
                                grid: {
                                  color: "rgba(255, 255, 255, 0.1)",
                                },
                                ticks: {
                                  color: "#9CA3AF",
                                  stepSize: 100,
                                  callback: (value) => `${value}`,
                                },
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: "RPM",
                                  color: "#E5E7EB",
                                  font: { size: 14 },
                                },
                                grid: {
                                  color: "rgba(255, 255, 255, 0.1)",
                                },
                                ticks: {
                                  color: "#9CA3AF",
                                },
                              },
                            },
                            interaction: {
                              intersect: false,
                              mode: "index",
                            },
                          }}
                        />
                        <div className="text-center text-white text-xs mt-4 italic">
                          (Simulerad effektkurva)
                        </div>

                        <div className="block md:hidden text-center mt-4 space-y-1">
                          <p className="text-sm text-white font-semibold">
                            {stage.tunedHk} HK & {stage.tunedNm} NM
                            <span className="text-gray-400 text-sm">
                              [
                              {stage.name
                                .replace("Steg", "STEG ")
                                .replace(/\s+/g, "")
                                .toUpperCase()}
                              ]
                            </span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 mb-10 flex justify-center">
                        <button
                          onClick={() => handleBookNow(stage.name)}
                          className="mt-8 bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                        >
                          📩 KONTAKT
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-gray-300">
            Ingen steginformation tillgänglig för denna motor.
          </p>
        </div>
      )}

      <ContactModal
        isOpen={contactModalData.isOpen}
        onClose={() =>
          setContactModalData({ isOpen: false, stageOrOption: "", link: "" })
        }
        selectedVehicle={{
          brand: brandData?.name || "",
          model: modelData?.name || "",
          year: yearData?.range || "",
          engine: engineData.label || "",
        }}
        stageOrOption={contactModalData.stageOrOption}
        link={contactModalData.link}
      />
    </div>
  );
}

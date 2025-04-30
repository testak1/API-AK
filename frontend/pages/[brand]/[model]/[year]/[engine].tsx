// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
} from "chart.js";
import { Line } from "react-chartjs-2";

Chart.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController
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

const generateDynoCurve = (peakValue: number, isHp: boolean) => {
  const rpmRange = [2000, 3000, 4000, 5000, 6000, 7000];
  const peakIndex = isHp ? 4 : 3; // HP peak later, NM peak earlier
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
    <div className="max-w-4xl mx-auto p-4">
      {/* Vehicle Info Card */}
      <div className="bg-gray-800 rounded-xl p-6 mb-8 flex flex-col md:flex-row items-center gap-6">
        {brandData?.logo?.asset && (
          <img
            src={urlFor(brandData.logo).width(120).url()}
            alt={brandData.name}
            className="h-16 w-auto"
          />
        )}
        <div>
          <h1 className="text-2xl font-bold">
            {brandData?.name} {modelData?.name}
          </h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="bg-gray-700 px-3 py-1 rounded-full text-sm">
              {yearData?.range}
            </span>
            <span className="bg-indigo-600 px-3 py-1 rounded-full text-sm">
              {engineData.label}
            </span>
          </div>
        </div>
      </div>

      {/* Performance Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-indigo-500"></div>

        {engineData.stages?.map((stage, index) => (
          <div key={stage.name} className="relative pl-12 pb-8">
            {/* Circle indicator */}
            <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-indigo-600 border-4 border-gray-900 flex items-center justify-center text-white font-bold">
              {index + 1}
            </div>

            {/* Stage Card */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-bold">{stage.name}</h3>
                <span className="bg-red-600 text-white px-3 py-1 rounded-full">
                  {stage.price?.toLocaleString()} kr
                </span>
              </div>

              {/* Performance Dots */}
              <div className="flex justify-between mt-6 mb-4">
                <div className="text-center">
                  <div className="w-4 h-4 bg-red-500 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs">Original</span>
                </div>
                <div className="text-center">
                  <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-1"></div>
                  <span className="text-xs">Tuned</span>
                </div>
              </div>

              {/* Performance Lines */}
              <div className="relative h-24 mb-4">
                {/* HP Line */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-red-500"
                    style={{
                      width: `${(stage.origHk / (stage.tunedHk + 100)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-green-500"
                    style={{
                      width: `${(stage.tunedHk / (stage.tunedHk + 100)) * 100}%`,
                    }}
                  ></div>
                </div>

                {/* NM Line */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-blue-500"
                    style={{
                      width: `${(stage.origNm / (stage.tunedNm + 100)) * 100}%`,
                    }}
                  ></div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                  <div
                    className="h-full bg-cyan-400"
                    style={{
                      width: `${(stage.tunedNm / (stage.tunedNm + 100)) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-900 p-3 rounded text-center">
                  <p className="text-sm text-gray-400">HK</p>
                  <p className="text-lg">
                    <span className="text-red-400">{stage.origHk}</span> →{" "}
                    <span className="text-green-400">{stage.tunedHk}</span>
                  </p>
                </div>
                <div className="bg-gray-900 p-3 rounded text-center">
                  <p className="text-sm text-gray-400">NM</p>
                  <p className="text-lg">
                    <span className="text-blue-400">{stage.origNm}</span> →{" "}
                    <span className="text-cyan-400">{stage.tunedNm}</span>
                  </p>
                </div>
              </div>

              {/* Mini Graph */}
              <div className="h-40 mt-4">
                <Line
                  data={{
                    labels: ["2000", "3000", "4000", "5000", "6000", "7000"],
                    datasets: [
                      {
                        label: "HK",
                        data: generateDynoCurve(stage.tunedHk, true),
                        borderColor: "#4ade80",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        tension: 0.4,
                        pointRadius: 0,
                      },
                      {
                        label: "NM",
                        data: generateDynoCurve(stage.tunedNm, false),
                        borderColor: "#22d3ee",
                        backgroundColor: "transparent",
                        borderWidth: 2,
                        tension: 0.4,
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
                          color: "#e5e7eb",
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          color: "rgba(255,255,255,0.1)",
                        },
                        ticks: {
                          color: "#9ca3af",
                        },
                      },
                      y: {
                        grid: {
                          color: "rgba(255,255,255,0.1)",
                        },
                        ticks: {
                          color: "#9ca3af",
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

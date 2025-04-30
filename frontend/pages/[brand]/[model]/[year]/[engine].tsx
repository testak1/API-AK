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
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col md:flex-row gap-8 mb-12">
        {/* Vehicle Info */}
        <div className="md:w-1/3 bg-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-4 mb-6">
            {brandData?.logo?.asset && (
              <img
                src={urlFor(brandData.logo).width(80).url()}
                alt={brandData.name}
                className="h-12 w-auto"
              />
            )}
            <h1 className="text-2xl font-bold">{brandData?.name}</h1>
          </div>

          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Modell</p>
              <p className="text-lg">{modelData?.name}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Årsmodell</p>
              <p className="text-lg">{yearData?.range}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Motor</p>
              <p className="text-lg">{engineData.label}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Bränsle</p>
              <p className="text-lg capitalize">{engineData.fuel}</p>
            </div>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="md:w-2/3 bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Prestandajämförelse</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="pb-3 text-left">Steg</th>
                  <th className="pb-3 text-right">HK (Original)</th>
                  <th className="pb-3 text-right">HK (Tuned)</th>
                  <th className="pb-3 text-right">NM (Original)</th>
                  <th className="pb-3 text-right">NM (Tuned)</th>
                  <th className="pb-3 text-right">Pris</th>
                </tr>
              </thead>
              <tbody>
                {engineData.stages?.map((stage) => (
                  <tr
                    key={stage.name}
                    className="border-b border-gray-700 hover:bg-gray-700"
                  >
                    <td className="py-4 font-medium">{stage.name}</td>
                    <td className="py-4 text-right">{stage.origHk}</td>
                    <td className="py-4 text-right text-green-400 font-bold">
                      {stage.tunedHk} (+{stage.tunedHk - stage.origHk})
                    </td>
                    <td className="py-4 text-right">{stage.origNm}</td>
                    <td className="py-4 text-right text-cyan-400 font-bold">
                      {stage.tunedNm} (+{stage.tunedNm - stage.origNm})
                    </td>
                    <td className="py-4 text-right">
                      <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm">
                        {stage.price?.toLocaleString()} kr
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Visual Comparison */}
      <div className="grid md:grid-cols-2 gap-8">
        {engineData.stages?.map((stage) => (
          <div key={stage.name} className="bg-gray-800 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4">{stage.name}</h3>

            <div className="h-64">
              <Line
                data={{
                  labels: ["2000", "3000", "4000", "5000", "6000", "7000"],
                  datasets: [
                    {
                      label: "Original HK",
                      data: generateDynoCurve(stage.origHk, true),
                      borderColor: "#f87171",
                      borderWidth: 2,
                      borderDash: [5, 3],
                      tension: 0.4,
                      pointRadius: 0,
                    },
                    {
                      label: "Tuned HK",
                      data: generateDynoCurve(stage.tunedHk, true),
                      borderColor: "#4ade80",
                      borderWidth: 3,
                      tension: 0.4,
                      pointRadius: 0,
                    },
                    {
                      label: "Original NM",
                      data: generateDynoCurve(stage.origNm, false),
                      borderColor: "#93c5fd",
                      borderWidth: 2,
                      borderDash: [5, 3],
                      tension: 0.4,
                      pointRadius: 0,
                    },
                    {
                      label: "Tuned NM",
                      data: generateDynoCurve(stage.tunedNm, false),
                      borderColor: "#22d3ee",
                      borderWidth: 3,
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
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: "rgba(255,255,255,0.1)",
                      },
                      ticks: {
                        color: "#9ca3af",
                      },
                    },
                    x: {
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

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="font-bold text-green-400 mb-2">Hästkrafter</h4>
                <div className="flex justify-between">
                  <span>Original:</span>
                  <span>{stage.origHk} hk</span>
                </div>
                <div className="flex justify-between">
                  <span>Tuned:</span>
                  <span className="text-green-400 font-bold">
                    {stage.tunedHk} hk
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ökning:</span>
                  <span className="text-green-400">
                    +{stage.tunedHk - stage.origHk} hk
                  </span>
                </div>
              </div>

              <div className="bg-gray-900 p-4 rounded-lg">
                <h4 className="font-bold text-cyan-400 mb-2">Vridmoment</h4>
                <div className="flex justify-between">
                  <span>Original:</span>
                  <span>{stage.origNm} Nm</span>
                </div>
                <div className="flex justify-between">
                  <span>Tuned:</span>
                  <span className="text-cyan-400 font-bold">
                    {stage.tunedNm} Nm
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Ökning:</span>
                  <span className="text-cyan-400">
                    +{stage.tunedNm - stage.origNm} Nm
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { GetServerSideProps } from "next";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine, Stage } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import { useState } from "react";
import { PortableText } from "@portabletext/react";
import Head from "next/head";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

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

export const getServerSideProps: GetServerSideProps<EnginePageProps> = async (context) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  try {
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return { notFound: true };

    const modelData = brandData.models?.find(
      (m: Model) => normalizeString(m.name) === normalizeString(model) ||
        (m.slug && normalizeString(typeof m.slug === "string" ? m.slug : m.slug.current) === normalizeString(model))
      ) || null;

    if (!modelData) return { notFound: true };

    const yearData = modelData.years?.find(
      (y: Year) => normalizeString(y.range) === normalizeString(year) ||
        (y.slug && normalizeString(y.slug) === normalizeString(year))
      ) || null;

    if (!yearData) return { notFound: true };

    const engineData = yearData.engines?.find(
      (e: Engine) => normalizeString(e.label) === normalizeString(engine) ||
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
        className="rounded-lg object-cover w-full h-auto my-4"
      />
    ),
  },
  marks: {
    link: ({ children, value }: any) => (
      <a href={value.href} className="text-blue-400 hover:text-blue-300 underline">
        {children}
      </a>
    ),
  },
};

const generateDynoCurve = (peakValue: number, isHp: boolean) => {
  const rpmRange = [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];
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
  const [compareMode, setCompareMode] = useState(false);
  const [selectedStages, setSelectedStages] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'performance' | 'description' | 'options'>('performance');

  const toggleStageSelection = (stageName: string) => {
    setSelectedStages(prev =>
      prev.includes(stageName)
        ? prev.filter(name => name !== stageName)
        : [...prev, stageName]
    );
  };

  const generateChartData = () => {
    const rpmRange = ["2000", "2500", "3000", "3500", "4000", "4500", "5000", "5500", "6000", "6500", "7000"];
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];
    
    const datasets = selectedStages.flatMap((stageName, idx) => {
      const stage = engineData?.stages?.find(s => s.name === stageName);
      if (!stage) return [];
      
      return [
        {
          label: `${stageName} HK`,
          data: generateDynoCurve(stage.tunedHk, true),
          borderColor: colors[idx % colors.length],
          backgroundColor: 'transparent',
          borderWidth: 3,
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: `${stageName} NM`,
          data: generateDynoCurve(stage.tunedNm, false),
          borderColor: colors[idx % colors.length],
          backgroundColor: 'transparent',
          borderWidth: 3,
          borderDash: [5, 5],
          tension: 0.4,
          yAxisID: 'y1',
        }
      ];
    });

    return {
      labels: rpmRange,
      datasets,
    };
  };

  if (!engineData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} / {router.query.engine}
        </h1>
        <p className="text-lg text-red-500">Engine data not found</p>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{brandData?.name} {modelData?.name} | Performance Tuning</title>
        <meta name="description" content={`${engineData.label} tuning options and specifications`} />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              {brandData?.logo?.asset && (
                <img
                  src={urlFor(brandData.logo).width(80).url()}
                  alt={brandData.name}
                  className="h-12 w-auto"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {brandData?.name} {modelData?.name}
                </h1>
                <p className="text-gray-600">
                  {yearData?.range} • {engineData.label} • {engineData.fuel}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompareMode(!compareMode)}
              className={`px-4 py-2 rounded-md ${compareMode ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {compareMode ? 'Exit Comparison' : 'Compare Stages'}
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
          {compareMode ? (
            <div className="bg-white rounded-xl shadow-md overflow-hidden p-6 mb-8">
              <h2 className="text-xl font-semibold mb-6">Stage Comparison</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {engineData.stages?.map(stage => (
                  <div key={stage.name} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={selectedStages.includes(stage.name)}
                      onChange={() => toggleStageSelection(stage.name)}
                      className="h-5 w-5 text-indigo-600 rounded"
                    />
                    <label className="ml-3 flex items-center">
                      <span className="font-medium">{stage.name}</span>
                      <span className="ml-auto bg-gray-100 px-3 py-1 rounded-full text-sm">
                        {stage.price?.toLocaleString()} kr
                      </span>
                    </label>
                  </div>
                ))}
              </div>

              {selectedStages.length > 0 && (
                <div className="h-96">
                  <Line
                    data={generateChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      interaction: {
                        mode: 'index',
                        intersect: false,
                      },
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: {
                            color: '#374151',
                            font: {
                              size: 14
                            }
                          }
                        },
                        tooltip: {
                          enabled: true,
                          mode: 'index',
                          intersect: false
                        }
                      },
                      scales: {
                        y: {
                          type: 'linear',
                          display: true,
                          position: 'left',
                          title: {
                            display: true,
                            text: 'Horsepower (HK)',
                            color: '#374151'
                          },
                          grid: {
                            drawOnChartArea: true,
                          },
                          ticks: {
                            color: '#374151'
                          }
                        },
                        y1: {
                          type: 'linear',
                          display: true,
                          position: 'right',
                          title: {
                            display: true,
                            text: 'Torque (Nm)',
                            color: '#374151'
                          },
                          grid: {
                            drawOnChartArea: false,
                          },
                          ticks: {
                            color: '#374151'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'RPM',
                            color: '#374151'
                          },
                          grid: {
                            drawOnChartArea: true,
                          },
                          ticks: {
                            color: '#374151'
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {engineData.stages?.map(stage => (
                <div key={stage.name} className="bg-white rounded-xl shadow-md overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                        <h2 className="text-xl font-semibold">{stage.name}</h2>
                        <p className="text-gray-600">
                          {stage.tunedHk - stage.origHk} HK / {stage.tunedNm - stage.origNm} Nm increase
                        </p>
                      </div>
                      <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-lg font-medium">
                        {stage.price?.toLocaleString()} kr
                      </span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="border-b border-gray-200 mb-6">
                      <nav className="-mb-px flex space-x-8">
                        <button
                          onClick={() => setActiveTab('performance')}
                          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'performance' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                          Performance
                        </button>
                        <button
                          onClick={() => setActiveTab('description')}
                          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'description' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                          Description
                        </button>
                        <button
                          onClick={() => setActiveTab('options')}
                          className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'options' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                        >
                          Options
                        </button>
                      </nav>
                    </div>

                    {activeTab === 'performance' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                          <h3 className="text-lg font-medium mb-4">Dyno Chart</h3>
                          <div className="h-64">
                            <Line
                              data={{
                                labels: ["2000", "2500", "3000", "3500", "4000", "4500", "5000", "5500", "6000", "6500", "7000"],
                                datasets: [
                                  {
                                    label: 'Original HK',
                                    data: generateDynoCurve(stage.origHk, true),
                                    borderColor: '#9CA3AF',
                                    backgroundColor: 'transparent',
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    tension: 0.4
                                  },
                                  {
                                    label: 'Tuned HK',
                                    data: generateDynoCurve(stage.tunedHk, true),
                                    borderColor: '#3B82F6',
                                    backgroundColor: 'transparent',
                                    borderWidth: 3,
                                    tension: 0.4
                                  },
                                  {
                                    label: 'Original NM',
                                    data: generateDynoCurve(stage.origNm, false),
                                    borderColor: '#9CA3AF',
                                    backgroundColor: 'transparent',
                                    borderWidth: 2,
                                    borderDash: [5, 5],
                                    tension: 0.4
                                  },
                                  {
                                    label: 'Tuned NM',
                                    data: generateDynoCurve(stage.tunedNm, false),
                                    borderColor: '#10B981',
                                    backgroundColor: 'transparent',
                                    borderWidth: 3,
                                    tension: 0.4
                                  }
                                ]
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    position: 'top',
                                    labels: {
                                      color: '#374151'
                                    }
                                  }
                                },
                                scales: {
                                  y: {
                                    beginAtZero: true,
                                    grid: {
                                      color: 'rgba(0, 0, 0, 0.05)'
                                    },
                                    ticks: {
                                      color: '#374151'
                                    }
                                  },
                                  x: {
                                    grid: {
                                      color: 'rgba(0, 0, 0, 0.05)'
                                    },
                                    ticks: {
                                      color: '#374151'
                                    }
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-lg font-medium mb-4">Specifications</h3>
                          <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Horsepower (HK)</span>
                                <div className="text-right">
                                  <span className="text-gray-500 line-through mr-2">{stage.origHk}</span>
                                  <span className="font-semibold text-blue-600">{stage.tunedHk}</span>
                                  <span className="ml-2 text-green-600">+{stage.tunedHk - stage.origHk}</span>
                                </div>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-blue-600 h-2.5 rounded-full"
                                  style={{ width: `${(stage.tunedHk / (stage.tunedHk + 100)) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="bg-gray-50 p-4 rounded-lg">
                              <div className="flex justify-between items-center">
                                <span className="font-medium">Torque (Nm)</span>
                                <div className="text-right">
                                  <span className="text-gray-500 line-through mr-2">{stage.origNm}</span>
                                  <span className="font-semibold text-green-600">{stage.tunedNm}</span>
                                  <span className="ml-2 text-green-600">+{stage.tunedNm - stage.origNm}</span>
                                </div>
                              </div>
                              <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-green-500 h-2.5 rounded-full"
                                  style={{ width: `${(stage.tunedNm / (stage.tunedNm + 100)) * 100}%` }}
                                ></div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mt-6">
                              <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Original</h4>
                                <p className="text-lg">{stage.origHk} HK</p>
                                <p className="text-lg">{stage.origNm} Nm</p>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-lg border border-green-100">
                                <h4 className="text-sm font-medium text-gray-500 mb-1">Tuned</h4>
                                <p className="text-lg text-blue-600">{stage.tunedHk} HK</p>
                                <p className="text-lg text-green-600">{stage.tunedNm} Nm</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'description' && stage.descriptionRef?.description && (
                      <div className="prose max-w-none">
                        <PortableText
                          value={stage.descriptionRef.description}
                          components={portableTextComponents}
                        />
                      </div>
                    )}

                    {activeTab === 'options' && (
                      <div className="space-y-4">
                        <p className="text-gray-600">Available options for this stage:</p>
                        {/* Add your options content here */}
                      </div>
                    )}
                  </div>

                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">
                      Contact About {stage.name}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}

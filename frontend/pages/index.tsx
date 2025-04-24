// pages/index.tsx
import React from 'react';
import { useEffect, useState, useRef, useMemo } from 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PortableText } from '@portabletext/react';
import { urlFor } from '@/lib/sanity';
import type { Brand, Stage, AktPlusOption, AktPlusOptionReference } from '@/types/sanity';
import ContactModal from '@/components/ContactModal';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController);

interface SelectionState {
  brand: string;
  model: string;
  year: string;
  engine: string;
}

export default function TuningViewer() {
  const [data, setData] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<SelectionState>({ 
    brand: '', 
    model: '', 
    year: '', 
    engine: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.src = '/ak-logo.png';
    img.onload = () => {
      watermarkImageRef.current = img;
    };
    
    const fetchData = async () => {
      try {
        const res = await fetch('/api/brands');
        if (!res.ok) throw new Error('Failed to fetch data');
        const json = await res.json();
        setData(json.result || []);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const { brands, models, years, engines, selectedEngine, stages, groupedEngines } = useMemo(() => {
    const brands = data.map(b => b.name);
    const models = data.find(b => b.name === selected.brand)?.models || [];
    const years = models.find(m => m.name === selected.model)?.years || [];
    const engines = years.find(y => y.range === selected.year)?.engines || [];
    const selectedEngine = engines.find(e => e.label === selected.engine);
    const stages = selectedEngine?.stages || [];

    const groupedEngines = engines.reduce((acc, engine) => {
      const fuelType = engine.fuel;
      if (!acc[fuelType]) acc[fuelType] = [];
      acc[fuelType].push(engine);
      return acc;
    }, {} as Record<string, typeof engines>);

    return { brands, models, years, engines, selectedEngine, stages, groupedEngines };
  }, [data, selected]);

  useEffect(() => {
    if (stages.length > 0) {
      const initialExpandedStates = stages.reduce((acc, stage) => {
        acc[stage.name] = stage.name === 'Steg 1';
        return acc;
      }, {} as Record<string, boolean>);
      setExpandedStages(initialExpandedStates);
    }
  }, [stages]);

  const watermarkPlugin = {
    id: 'watermark',
    beforeDraw: (chart: Chart) => {
      const ctx = chart.ctx;
      const { chartArea: { top, left, width, height } } = chart;
      
      if (watermarkImageRef.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        
        const img = watermarkImageRef.current;
        const ratio = img.width / img.height;
        const imgWidth = width * 0.4;
        const imgHeight = imgWidth / ratio;
        
        const x = left + width / 2 - imgWidth / 2;
        const y = top + height / 2 - imgHeight / 2;
        
        ctx.drawImage(img, x, y, imgWidth, imgHeight);
        ctx.restore();
      }
    }
  };

const isExpandedAktPlusOption = (item: any): item is AktPlusOption => {
  return item && '_id' in item && 'title' in item;
};

const getAllAktPlusOptions = useMemo(() => (stage: Stage) => {
  if (!selectedEngine) return [];

  const combinedOptions: AktPlusOptionReference[] = [
    ...(selectedEngine.globalAktPlusOptions || []),
    ...(stage.aktPlusOptions || [])
  ];

  const uniqueOptionsMap = new Map<string, AktPlusOption>();

  (combinedOptions as AktPlusOptionReference[])
    .filter(isExpandedAktPlusOption)
    .forEach(opt => {
      if (
        (opt.isUniversal ||
         opt.applicableFuelTypes?.includes(selectedEngine.fuel) ||
         opt.manualAssignments?.some(ref => ref._ref === selectedEngine._id)) &&
        (!opt.stageCompatibility || opt.stageCompatibility === stage.name)
      ) {
        uniqueOptionsMap.set(opt._id, opt);
      }
    });

  return Array.from(uniqueOptionsMap.values());
}, [selectedEngine]);

  const generateDynoCurve = (peakValue: number, isHp: boolean) => {
    const rpmRange = [2000, 3000, 4000, 5000, 6000, 7000];
    const peakRpmIndex = isHp ? 3 : 2;
    
    return rpmRange.map((rpm, i) => {
      if (i <= peakRpmIndex) {
        const progress = i / peakRpmIndex;
        return peakValue * (0.4 + 0.6 * Math.pow(progress, 1.5));
      } else {
        const fallProgress = (i - peakRpmIndex) / (rpmRange.length - 1 - peakRpmIndex);
        return peakValue * (1 - 0.5 * Math.pow(fallProgress, 1.2));
      }
    });
  };

  const toggleStage = (stageName: string) => {
    setExpandedStages(prev => ({
      ...prev,
      [stageName]: !prev[stageName]
    }));
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId]
    }));
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected({ brand: e.target.value, model: '', year: '', engine: '' });
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({ ...prev, model: e.target.value, year: '', engine: '' }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({ ...prev, year: e.target.value, engine: '' }));
  };

  const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({ ...prev, engine: e.target.value }));
  };

  const portableTextComponents = {
    types: {
      image: ({ value }: any) => (
        <img 
          src={urlFor(value).width(100).url()} 
          alt={value.alt || ''}
          className="my-4 rounded-lg shadow-md"
        />
      )
    },
    marks: {
      link: ({ children, value }: any) => (
        <a href={value.href} className="text-blue-400 hover:text-blue-300 underline">
          {children}
        </a>
      )
    }
  };

const renderStageDescription = (stage: Stage) => {
  const description = stage.descriptionRef?.description || stage.description;
  const isExpanded = expandedDescriptions[stage.name] ?? false;

  if (!description) return null;

  return (
    <div className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() =>
          setExpandedDescriptions(prev => ({
            ...prev,
            [stage.name]: !prev[stage.name]
          }))
        }
        className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-left flex justify-between items-center"
      >
        <span className="text-white font-medium">
          STAGE {stage.name.replace(/\D/g, '')} INFO
        </span>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="prose prose-invert max-w-none p-4 bg-gray-800">
          {typeof description === 'string' ? (
            <p>{description}</p>
          ) : (
            <PortableText value={description} components={portableTextComponents} />
          )}
        </div>
      )}
    </div>
  );
};

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
          AK-TUNING
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        <div>
          <label className="block text-sm font-bold text-black mb-1">MÄRKE</label>
          <select
            className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
            }`}
            value={selected.brand}
            onChange={handleBrandChange}
            disabled={isLoading}
          >
            <option value="">VÄLJ MÄRKE</option>
            {brands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-black mb-1">MODELL</label>
          <select
            className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              !selected.brand ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
            }`}
            value={selected.model}
            onChange={handleModelChange}
            disabled={!selected.brand}
          >
            <option value="">VÄLJ MODELL</option>
            {models.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-black mb-1">ÅRSMODELL</label>
          <select
            className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              !selected.model ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
            }`}
            value={selected.year}
            onChange={handleYearChange}
            disabled={!selected.model}
          >
            <option value="">VÄLJ ÅRSMODELL</option>
            {years.map(y => (
              <option key={y.range} value={y.range}>{y.range}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-black mb-1">MOTOR</label>
          <select
            className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              !selected.year ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
            }`}
            value={selected.engine}
            onChange={handleEngineChange}
            disabled={!selected.year}
          >
            <option value="">VÄLJ MOTOR</option>
            {Object.entries(groupedEngines).map(([fuelType, engines]) => (
              <optgroup 
                label={fuelType.charAt(0).toUpperCase() + fuelType.slice(1)} 
                key={fuelType}
              >
                {engines.map(engine => (
                  <option key={engine.label} value={engine.label}>
                    {engine.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : stages.length > 0 ? (
        <div className="space-y-6">
          {stages.map((stage) => {
            const allOptions = getAllAktPlusOptions(stage);
            const isExpanded = expandedStages[stage.name] ?? false;

            return (
              <div key={stage.name} className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
                <button
                  onClick={() => toggleStage(stage.name)}
                  className="w-full p-6 text-left"
                >
<div className="flex flex-col md:flex-row md:items-center md:justify-between">
  <div className="flex items-center space-x-4">
    <h2 className="text-xl font-semibold text-white">
      <span className="text-indigo-400">{stage.name}</span> - {selected.engine}
    </h2>
    {/* Brand logo */}
    {data.find(b => b.name === selected.brand)?.logo?.asset && (
      <img
        src={urlFor(data.find(b => b.name === selected.brand)?.logo).width(60).url()}
        alt={selected.brand}
        className="h-8 object-contain"
      />
    )}
  </div>
  
  <div className="mt-3 md:mt-0 flex items-center gap-4">
    {/* Stage badge image */}
    <img
      src={`/badges/${stage.name.toLowerCase().replace(/\s+/g, '')}.png`} // e.g. steg1.png
      alt={stage.name}
      className="h-8 object-contain"
    />
    <span className="inline-block bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
      {stage.price?.toLocaleString()} kr
    </span>
    <svg
      className={`h-5 w-5 text-gray-400 transition-transform ${
        isExpanded ? 'rotate-180' : ''
      }`}
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  </div>
</div>

                </button>



<ContactModal
  isOpen={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  selectedVehicle={selected}
/>


                {isExpanded && (
                  <div className="px-6 pb-6">
                    {renderStageDescription(stage)}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="border border-gray-700 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-400 mb-1">ORIGINAL HK</p>
                        <p className="text-xl text-white font-bold">{stage.origHk} hk</p>
                      </div>
                      <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-400 mb-1">OPTIMERAD HK</p>
                        <p className="text-xl font-bold">{stage.tunedHk} hk</p>
                        <p className="text-xs mt-1 text-red-400">+{stage.tunedHk - stage.origHk} hk</p>
                      </div>
                      <div className="border border-gray-700 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-400 mb-1">ORIGINAL NM</p>
                        <p className="text-xl text-white font-bold">{stage.origNm} Nm</p>
                      </div>
                      <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                        <p className="text-sm text-gray-400 mb-1">OPTIMERAD NM</p>
                        <p className="text-xl font-bold">{stage.tunedNm} Nm</p>
                        <p className="text-xs mt-1 text-red-400">+{stage.tunedNm - stage.origNm} Nm</p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h3 className="text-lg font-medium text-gray-300 mb-2">{stage.name} DYNO Chart</h3>
                      <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                        <div className="absolute right-4 top-4 bg-gray-800 px-2 py-1 rounded text-sm">
                          <p className="text-amber-400">Max HK: {stage.tunedHk}</p>
                          <p className="text-blue-400">Max NM: {stage.tunedNm}</p>
                        </div>
                        
                        <Line
                          data={{
                            labels: ['2000', '3000', '4000', '5000', '6000', '7000'],
                            datasets: [
                              {
                                label: 'Original HK',
                                data: generateDynoCurve(stage.origHk, true),
                                borderColor: 'rgba(251, 191, 36, 0.7)',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                borderDash: [5, 3],
                                tension: 0.3,
                                pointRadius: 0,
                                yAxisID: 'hp',
                              },
                              {
                                label: 'Tuned HK',
                                data: generateDynoCurve(stage.tunedHk, true),
                                borderColor: 'rgba(251, 191, 36, 1)',
                                backgroundColor: 'transparent',
                                borderWidth: 3,
                                tension: 0.3,
                                pointRadius: 0,
                                yAxisID: 'hp',
                              },
                              {
                                label: 'Original NM',
                                data: generateDynoCurve(stage.origNm, false),
                                borderColor: 'rgba(96, 165, 250, 0.7)',
                                backgroundColor: 'transparent',
                                borderWidth: 2,
                                borderDash: [5, 3],
                                tension: 0.3,
                                pointRadius: 0,
                                yAxisID: 'nm',
                              },
                              {
                                label: 'Tuned NM',
                                data: generateDynoCurve(stage.tunedNm, false),
                                borderColor: 'rgba(96, 165, 250, 1)',
                                backgroundColor: 'transparent',
                                borderWidth: 3,
                                tension: 0.3,
                                pointRadius: 0,
                                yAxisID: 'nm',
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
                                  color: '#E5E7EB',
                                  font: { size: 12 },
                                  boxWidth: 12,
                                  padding: 20,
                                  usePointStyle: true,
                                }
                              },
                              tooltip: {
                                mode: 'index',
                                intersect: false,
                              }
                            },
                            scales: {
                              hp: {
                                type: 'linear',
                                display: true,
                                position: 'left',
                                title: {
                                  display: true,
                                  text: 'Effekt (HK)',
                                  color: '#F59E0B',
                                  font: { 
                                    size: 14,
                                    weight: 'bold'
                                  }
                                },
                                min: 0,
                                max: Math.ceil(stage.tunedHk / 100) * 100 + 50,
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                  color: '#9CA3AF',
                                  stepSize: 100,
                                  callback: (value) => `${value}`
                                }
                              },
                              nm: {
                                type: 'linear',
                                display: true,
                                position: 'right',
                                title: {
                                  display: true,
                                  text: 'Vridmoment (Nm)',
                                  color: '#3B82F6',
                                  font: { 
                                    size: 14,
                                    weight: 'bold'
                                  }
                                },
                                min: 0,
                                max: Math.ceil(stage.tunedNm / 100) * 100 + 100,
                                grid: {
                                  drawOnChartArea: false,
                                },
                                ticks: {
                                  color: '#9CA3AF',
                                  stepSize: 100,
                                  callback: (value) => `${value}`
                                }
                              },
                              x: {
                                title: {
                                  display: true,
                                  text: 'RPM',
                                  color: '#E5E7EB',
                                  font: { 
                                    size: 14,
                                    weight: 'bold'
                                  }
                                },
                                grid: {
                                  color: 'rgba(255, 255, 255, 0.1)'
                                },
                                ticks: {
                                  color: '#9CA3AF'
                                }
                              }
                            },
                            interaction: {
                              intersect: false,
                              mode: 'index',
                            }
                          }}
                          plugins={[watermarkPlugin]}
                        />




                      </div>
                    </div>

<div className="text-center text-orange-600 text-sm">
  <p>Detta är en datorgenererad dyno-bild</p>
</div>

{/* Add spacer */}
<div className="mt-6 mb-10 flex justify-center">
  <button
    onClick={() => setIsContactModalOpen(true)}
    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors"
  >
    📩 BOKA/KONTAKTA OSS
  </button>
</div>



{allOptions.length > 0 && (
  <div className="mt-8">
    {/* AKT+ HEADER WITH LOGO */}
    <div className="flex items-center gap-4 mb-4">
      <img
        src="/logos/aktplus.png"
        alt="AKT+ Logo"
        className="h-10 w-auto object-contain"
      />
      <h3 className="text-xl font-semibold text-white">TILLÄGG</h3>
<p>Tryck på flikarna nedanför för mer information</p>
    </div>

    <div className="space-y-4">
      {allOptions.map((option) => (
        <div key={option._id} className="border border-gray-600 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleOption(option._id)}
            className="w-full flex justify-between items-center p-4 bg-gray-700 hover:bg-gray-600 transition-colors"
          >
<div className="flex items-center gap-3">
  {option.gallery?.[0]?.asset && (
    <img
      src={urlFor(option.gallery[0].asset).width(80).url()}
      alt={option.gallery[0].alt || option.title}
      className="h-10 w-10 object-contain"
    />
  )}
  <span className="font-large text-orange">{option.title}</span>
              {option.isUniversal && (
                <span className="ml-2 px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded-full">
                  Universal
                </span>
              )}
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${
                expandedOptions[option._id] ? 'rotate-180' : ''
              }`}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </button>
                              
{expandedOptions[option._id] && (
  <div className="p-4 bg-gray-800">
    {/* Description Text */}
    {option.description && (
      <div className="prose prose-invert max-w-none mb-4">
        <PortableText
          value={option.description}
          components={portableTextComponents}
        />
      </div>
    )}

    {/* Gallery removed */}

    {/* Cost and CTA */}
    <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        {option.price && (
          <p className="text-lg font-semibold text-green-400">
            KOSTNAD: {option.price.toLocaleString()} KR
          </p>
        )}
      </div>
<button
  onClick={() => setIsModalOpen(true)}
  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors whitespace-nowrap"
>
  Contact us for details
</button>
    </div>
  </div>
)}

                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-gray-400">
EXTRA INFO RUTA KANSKE?
          </p>
        </div>
      )}

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        selectedVehicle={{
          brand: selected.brand,
          model: selected.model,
          year: selected.year,
          engine: selected.engine
        }}
      />
    </div>
  );
}
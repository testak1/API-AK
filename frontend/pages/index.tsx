// pages/index.tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
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
  const [selected, setSelected] = useState<SelectionState>({ brand: '', model: '', year: '', engine: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const [contactModalData, setContactModalData] = useState<{ isOpen: boolean; stageOrOption: string }>({
    isOpen: false,
    stageOrOption: '',
  });

  const handleBookNow = (stageOrOptionName: string) => {
    setContactModalData({ isOpen: true, stageOrOption: stageOrOptionName });
  };

  useEffect(() => {
    const img = new Image();
    img.src = '/ak-logo.png';
    img.onload = () => { watermarkImageRef.current = img; };
  }, []);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch('/api/brands');
        if (!res.ok) throw new Error('Failed to fetch brands');
        const json = await res.json();
        setData(json.result || []);
      } catch (error) {
        console.error('Error fetching brands:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrands();
  }, []);

  useEffect(() => {
    const fetchYears = async () => {
      if (selected.brand && selected.model) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/years?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}`);
          if (!res.ok) throw new Error('Failed to fetch years');
          const years = await res.json();
          setData(prev => prev.map(brand => brand.name !== selected.brand ? brand : ({
            ...brand,
            models: brand.models.map(model => model.name !== selected.model ? model : ({
              ...model,
              years: years.result,
            })),
          })));
        } catch (error) {
          console.error('Error fetching years:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchYears();
  }, [selected.brand, selected.model]);

  useEffect(() => {
    const fetchEngines = async () => {
      if (selected.brand && selected.model && selected.year) {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/engines?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}&year=${encodeURIComponent(selected.year)}`
          );
          if (!res.ok) throw new Error('Failed to fetch engines');
          const engines = await res.json();
          setData(prev => prev.map(brand => brand.name !== selected.brand ? brand : ({
            ...brand,
            models: brand.models.map(model => model.name !== selected.model ? model : ({
              ...model,
              years: model.years.map(year => year.range !== selected.year ? year : ({
                ...year,
                engines: engines.result,
              })),
            })),
          })));
        } catch (error) {
          console.error('Error fetching engines:', error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchEngines();
  }, [selected.brand, selected.model, selected.year]);

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
    },
  };

  const isExpandedAktPlusOption = (item: any): item is AktPlusOption => item && '_id' in item && 'title' in item;

  const getAllAktPlusOptions = useMemo(() => (stage: Stage) => {
    if (!selectedEngine) return [];
    const combinedOptions: AktPlusOptionReference[] = [
      ...(selectedEngine.globalAktPlusOptions || []),
      ...(stage.aktPlusOptions || []),
    ];
    const uniqueOptionsMap = new Map<string, AktPlusOption>();
    (combinedOptions as AktPlusOptionReference[]).filter(isExpandedAktPlusOption).forEach(opt => {
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
    return rpmRange.map((_, i) => {
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
      [stageName]: !prev[stageName],
    }));
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptions(prev => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
  };

  const portableTextComponents = {
    types: {
      image: ({ value }: any) => (
        <img src={urlFor(value).width(100).url()} alt={value.alt || ''} className="my-4 rounded-lg shadow-md" />
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

  const renderStageDescription = (stage: Stage) => {
    const description = stage.descriptionRef?.description || stage.description;
    const isExpanded = expandedDescriptions[stage.name] ?? false;
    if (!description) return null;
    return (
      <div className="mb-6 border border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => setExpandedDescriptions(prev => ({
            ...prev,
            [stage.name]: !prev[stage.name],
          }))}
          className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-left flex justify-between items-center"
        >
          <span className="text-white font-medium">
            STAGE {stage.name.replace(/\D/g, '')} INFO
          </span>
          <svg className={`h-5 w-5 text-orange-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
          </svg>
        </button>
        {isExpanded && (
          <div className="prose prose-invert max-w-none p-4 bg-gray-800">
            {typeof description === 'string' ? <p>{description}</p> : <PortableText value={description} components={portableTextComponents} />}
          </div>
        )}
      </div>
    );
  };


return (
  <div className="max-w-5xl mx-auto p-4 md:p-8">
    {/* Page Header */}
    <div className="text-center mb-8">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
        AK-TUNING
      </h1>
    </div>

    {/* Dropdown Selectors */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
      <div>
        <label className="block text-sm font-bold text-black mb-1">MÄRKE</label>
        <select
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
          value={selected.brand}
          onChange={(e) => setSelected({ brand: e.target.value, model: '', year: '', engine: '' })}
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
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
          value={selected.model}
          onChange={(e) => setSelected(prev => ({ ...prev, model: e.target.value, year: '', engine: '' }))}
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
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
          value={selected.year}
          onChange={(e) => setSelected(prev => ({ ...prev, year: e.target.value, engine: '' }))}
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
          className="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
          value={selected.engine}
          onChange={(e) => setSelected(prev => ({ ...prev, engine: e.target.value }))}
          disabled={!selected.year}
        >
          <option value="">VÄLJ MOTOR</option>
          {Object.entries(groupedEngines).map(([fuelType, engines]) => (
            <optgroup key={fuelType} label={fuelType}>
              {engines.map(engine => (
                <option key={engine.label} value={engine.label}>{engine.label}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    </div>

    {/* Loading Spinner */}
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
              <button onClick={() => toggleStage(stage.name)} className="w-full p-6 text-left">
                <h2 className="text-xl font-bold text-white">{stage.name} - {selected.engine}</h2>
              </button>

              {isExpanded && (
                <div className="px-6 pb-6">
                  {/* Stage Description */}
                  {renderStageDescription(stage)}

                  {/* Dyno Chart */}
                  <div className="relative bg-gray-900 rounded-lg p-4 h-[480px] mb-8">
                    {/* Left Top (ORG HK / Max HK) */}
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500" />
                        <span className="text-white text-sm">ORG HK: {stage.origHk}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-0.5 bg-red-500" />
                        <span className="text-white text-sm">Max HK: {stage.tunedHk}</span>
                      </div>
                    </div>

                    {/* Right Top (ORG NM / Max NM) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-2 text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white text-sm">ORG NM: {stage.origNm}</span>
                        <div className="w-4 h-0.5 bg-blue-500" />
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-white text-sm">Max NM: {stage.tunedNm}</span>
                        <div className="w-4 h-0.5 bg-blue-500" />
                      </div>
                    </div>

                    {/* Chart */}
                    <Line
                      data={{
                        labels: ['2000', '3000', '4000', '5000', '6000', '7000'],
                        datasets: [
                          { label: '', data: generateDynoCurve(stage.origHk, true), borderColor: 'red', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], tension: 0.3, pointRadius: 0, yAxisID: 'hp' },
                          { label: '', data: generateDynoCurve(stage.tunedHk, true), borderColor: 'red', backgroundColor: 'transparent', borderWidth: 3, tension: 0.4, pointRadius: 0, yAxisID: 'hp' },
                          { label: '', data: generateDynoCurve(stage.origNm, false), borderColor: 'blue', backgroundColor: 'transparent', borderWidth: 2, borderDash: [5, 5], tension: 0.3, pointRadius: 0, yAxisID: 'nm' },
                          { label: '', data: generateDynoCurve(stage.tunedNm, false), borderColor: 'blue', backgroundColor: 'transparent', borderWidth: 3, tension: 0.4, pointRadius: 0, yAxisID: 'nm' },
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
                        scales: {
                          hp: { type: 'linear', position: 'left', title: { display: true, text: 'Effekt (HK)', color: 'white' }, ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' }},
                          nm: { type: 'linear', position: 'right', title: { display: true, text: 'Vridmoment (Nm)', color: 'white' }, ticks: { color: '#9CA3AF' }, grid: { drawOnChartArea: false }},
                          x: { title: { display: true, text: 'RPM', color: '#E5E7EB' }, ticks: { color: '#9CA3AF' }, grid: { color: 'rgba(255,255,255,0.1)' }}
                        },
                        interaction: { intersect: false, mode: 'index' }
                      }}
                      plugins={[watermarkPlugin]}
                    />
                  </div>

                  {/* Contact Button */}
                  <div className="text-center">
                    <button onClick={() => handleBookNow(stage.name)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg transition-colors">
                      📩 KONTAKT
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    ) : (
      <div className="text-center py-12 bg-gray-800 rounded-xl">
        <p className="text-white">EXTRA INFO RUTA KANSKE?</p>
      </div>
    )}

    {/* Contact Modal */}
    <ContactModal
      isOpen={contactModalData.isOpen}
      onClose={() => setContactModalData({ isOpen: false, stageOrOption: '' })}
      selectedVehicle={{
        brand: selected.brand,
        model: selected.model,
        year: selected.year,
        engine: selected.engine,
      }}
      stageOrOption={contactModalData.stageOrOption}
    />
  </div>
);

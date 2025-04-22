import { useEffect, useState, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { PortableText } from '@portabletext/react';  // Make sure you're importing from @portabletext/react

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController);

interface AktPlusOption {
  _id: string;
  title: string;
  description?: any[];
  gallery?: {
    _key: string;
    asset: {
      _ref: string;
    };
  }[];
  price?: number;
}

interface Stage {
  name: string;
  origHk: number;
  origNm: number;
  tunedHk: number;
  tunedNm: number;
  price: number;
  description?: string;
  aktPlusOptions?: AktPlusOption[];
}

interface Engine {
  label: string;
  fuel: string;
  stages: Stage[];
}

interface Year {
  range: string;
  engines: Engine[];
}

interface Model {
  name: string;
  years: Year[];
}

interface Brand {
  name: string;
  models: Model[];
}

export default function TuningViewer() {
  const [data, setData] = useState<Brand[]>([]);
  const [selected, setSelected] = useState({ 
    brand: '', 
    model: '', 
    year: '', 
    engine: '' 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Record<string, boolean>>({});
  const [expandedOptions, setExpandedOptions] = useState<Record<string, boolean>>({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Preload the watermark image
    const img = new Image();
    img.src = '/ak-logo.png';
    img.onload = () => {
      watermarkImageRef.current = img;
    };
    
    const fetchData = async () => {
      try {
        const res = await fetch('api/brands');
        const json = await res.json();
        setData(json.result);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Watermark plugin configuration
  const watermarkPlugin = {
    id: 'watermark',
    beforeDraw: (chart: any) => {
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
  }, {} as Record<string, Engine[]>);

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

  const toggleDescription = (stageName: string) => {
    setExpandedDescriptions(prev => ({
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

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-600 bg-clip-text text-transparent">
          AK-TUNING
        </h1>
      </div>

      {/* Vehicle Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
        {/* Vehicle Select Dropdowns */}
        {/* ... [Same as before] */}
      </div>

      {/* Tuning Stages */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : stages.length > 0 ? (
        <div className="space-y-6">
          {stages.map((stage) => (
            <div key={stage.name} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
              {/* Stage Header */}
              {/* ... [Same as before] */}
              
              {/* Expandable Description */}
              {stage.description && (
                <div className="mb-4">
                  <button
                    onClick={() => toggleDescription(stage.name)}
                    className="flex items-center text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <span>Stage Description</span>
                    <svg
                      className={`ml-2 h-4 w-4 transition-transform ${
                        expandedDescriptions[stage.name] ? 'rotate-180' : ''
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
                  
                  {expandedDescriptions[stage.name] && (
                    <div className="mt-2 p-4 bg-gray-700 rounded-lg">
                      <p className="text-gray-300">{stage.description}</p>
                    </div>
                  )}
                </div>
              )}

              {/* AKT+ Options Section */}
              {stage.aktPlusOptions && stage.aktPlusOptions.length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-medium text-white mb-4 border-b border-gray-600 pb-2">
                    AKT+ Options
                  </h3>
                  
                  <div className="space-y-4">
                    {stage.aktPlusOptions.map((option) => (
                      <div key={option._id} className="border border-gray-600 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleOption(option._id)}
                          className="w-full flex justify-between items-center p-4 bg-gray-700 hover:bg-gray-600 transition-colors"
                        >
                          <span className="font-medium text-white">{option.title}</span>
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
                            {/* Description Content */}
                            {option.description && (
                              <div className="prose prose-invert max-w-none">
                                <PortableText
                                  value={option.description}  // Updated to `value`
                                  components={{
                                    marks: {
                                      link: ({ children, mark }: any) => (
                                        <a href={mark.href} className="text-blue-400 hover:text-blue-300">
                                          {children}
                                        </a>
                                      ),
                                    },
                                  }}
                                />
                              </div>
                            )}
                            
                            {/* Photo Gallery */}
                            {option.gallery && option.gallery.length > 0 && (
                              <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {option.gallery.map((image) => (
                                  <img 
                                    key={image._key}
                                    src={`https://cdn.sanity.io/images/wensahkh/production/${image.asset._ref
                                      .replace('image-', '')
                                      .replace(/-[a-z0-9]+$/, '')}.jpg`}
                                    alt={option.title}
                                    className="rounded-lg object-cover h-40 w-full"
                                  />
                                ))}
                              </div>
                            )}
                            
                            {/* Price and Contact */}
                            <div className="mt-4 flex justify-between items-center">
                              {option.price && (
                                <span className="text-lg font-semibold text-green-400">
                                  +{option.price.toLocaleString()} kr
                                </span>
                              )}
                              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors">
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
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-gray-400">
            {selected.brand ? "No tuning stages available" : "Select a vehicle to view tuning options"}
          </p>
        </div>
      )}
    </div>
  );
}

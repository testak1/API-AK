import { useEffect, useState, useRef } from 'react';
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, LineController } from 'chart.js';
import { Line } from 'react-chartjs-2';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, LineController);

interface Stage {
  name: string;
  origHk: number;
  origNm: number;
  tunedHk: number;
  tunedNm: number;
  price: number;
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
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    // Preload the watermark image
    const img = new Image();
    img.src = '/ak-logo.png'; // Make sure this matches your actual logo path
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
        ctx.globalAlpha = 0.2; // Adjust opacity here
        
        // Calculate dimensions to maintain aspect ratio
        const img = watermarkImageRef.current;
        const ratio = img.width / img.height;
        const imgWidth = width * 0.4; // Watermark width relative to chart
        const imgHeight = imgWidth / ratio;
        
        // Center the watermark
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

  // Group engines by fuel type (bensin, diesel, hybrid)
  const groupedEngines = engines.reduce((acc, engine) => {
    const fuelType = engine.fuel;
    if (!acc[fuelType]) acc[fuelType] = [];
    acc[fuelType].push(engine);
    return acc;
  }, {} as Record<string, Engine[]>);

  // Generate realistic dyno curve based on peak values
  const generateDynoCurve = (peakValue: number, isHp: boolean) => {
    const rpmRange = [2000, 3000, 4000, 5000, 6000, 7000];
    const peakRpmIndex = isHp ? 3 : 2; // HP peaks at 5000, torque at 4000
    
    return rpmRange.map((rpm, i) => {
      // Build up to peak
      if (i <= peakRpmIndex) {
        const progress = i / peakRpmIndex;
        return peakValue * (0.4 + 0.6 * Math.pow(progress, 1.5));
      } 
      // Fall after peak
      else {
        const fallProgress = (i - peakRpmIndex) / (rpmRange.length - 1 - peakRpmIndex);
        return peakValue * (1 - 0.5 * Math.pow(fallProgress, 1.2));
      }
    });
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
        <div>
          <label className="block text-sm font-bold text-black mb-1">MÄRKE</label>
          <select
            className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-600'
            }`}
            value={selected.brand}
            onChange={(e) => setSelected({ brand: e.target.value, model: '', year: '', engine: '' })}
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
            onChange={(e) => setSelected({ ...selected, model: e.target.value, year: '', engine: '' })}
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
            onChange={(e) => setSelected({ ...selected, year: e.target.value, engine: '' })}
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
            onChange={(e) => setSelected({ ...selected, engine: e.target.value })}
            disabled={!selected.year}
          >
            <option value="">VÄLJ MOTOR</option>
            {Object.keys(groupedEngines).map((fuelType) => (
              <optgroup label={fuelType.charAt(0).toUpperCase() + fuelType.slice(1)} key={fuelType}>
                {groupedEngines[fuelType].map(engine => (
                  <option key={engine.label} value={engine.label}>
                    {engine.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
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
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-white">
                    <span className="text-indigo-400">{stage.name}</span> - {selected.engine}
                  </h2>
                  <p className="text-gray-400 text-sm mt-1">
                    {selected.brand} {selected.model} {selected.year}
                  </p>
                </div>
                <div className="mt-3 md:mt-0">
                  <span className="inline-block bg-blue-900 text-blue-200 px-3 py-1 rounded-full text-sm font-medium">
                    {stage.price?.toLocaleString()} kr
                  </span>
                </div>
              </div>

              {/* Performance Metrics */}
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

              {/* Dyno Chart */}
              <div className="mt-6">
                <h3 className="text-lg font-medium text-gray-300 mb-2">{stage.name} DYNO Chart</h3>
                <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                  {/* Max Value Indicators */}
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
                          borderColor: 'rgba(251, 191, 36, 0.7)', // Amber
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
                          borderColor: 'rgba(251, 191, 36, 1)', // Solid amber
                          backgroundColor: 'transparent',
                          borderWidth: 3,
                          tension: 0.3,
                          pointRadius: 0,
                          yAxisID: 'hp',
                        },
                        {
                          label: 'Original NM',
                          data: generateDynoCurve(stage.origNm, false),
                          borderColor: 'rgba(96, 165, 250, 0.7)', // Blue
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
                          borderColor: 'rgba(96, 165, 250, 1)', // Solid blue
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


        <div className="stage-description">
          {stage.descriptionRef?.description}
        </div>


        <div className="text-center text-white">
<p>Detta är en datorgenererad dyno-bild</p>
        </div>


                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-800 rounded-xl">
          <p className="text-gray-400">
            {selected.brand ? "No tuning stages available" : "Select a vehicle to view tuning options"}
          </p>
        </div>
      )
}
    </div>
  );
}
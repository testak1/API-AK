// pages/index.tsx
import React, { useEffect, useState } from 'react';
import { urlFor } from '@/lib/sanity';
import { Brand, Model, Year, Engine } from '@/types/sanity';

interface SelectionState {
  brand: string;
  model: string;
  year: string;
  engine: string;
}

export default function TuningViewer() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);
  const [selected, setSelected] = useState<SelectionState>({ brand: '', model: '', year: '', engine: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/brands');
      const json = await res.json();
      setBrands(json.result || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    }
  };

  const fetchModels = async (brand: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/models?brand=${encodeURIComponent(brand)}`);
      const json = await res.json();
      setModels(json.result || []);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchYears = async (brand: string, model: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/years?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`);
      const json = await res.json();
      setYears(json.result || []);
    } catch (error) {
      console.error('Error fetching years:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEngines = async (brand: string, model: string, year: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/engines?brand=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&year=${encodeURIComponent(year)}`);
      const json = await res.json();
      setEngines(json.result || []);
    } catch (error) {
      console.error('Error fetching engines:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const brand = e.target.value;
    setSelected({ brand, model: '', year: '', engine: '' });
    setModels([]);
    setYears([]);
    setEngines([]);
    if (brand) fetchModels(brand);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const model = e.target.value;
    setSelected(prev => ({ ...prev, model, year: '', engine: '' }));
    setYears([]);
    setEngines([]);
    if (model) fetchYears(selected.brand, model);
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const year = e.target.value;
    setSelected(prev => ({ ...prev, year, engine: '' }));
    setEngines([]);
    if (year) fetchEngines(selected.brand, selected.model, year);
  };

  const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const engine = e.target.value;
    setSelected(prev => ({ ...prev, engine }));
  };

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen">
      <h1 className="text-3xl font-bold text-center mb-10">AK-TUNING</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
        {/* BRAND */}
        <div>
          <label className="block text-sm font-bold mb-2">Märke</label>
          <select value={selected.brand} onChange={handleBrandChange} className="w-full p-3 rounded bg-gray-800 text-white">
            <option value="">Välj märke</option>
            {brands.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* MODEL */}
        <div>
          <label className="block text-sm font-bold mb-2">Modell</label>
          <select value={selected.model} onChange={handleModelChange} className="w-full p-3 rounded bg-gray-800 text-white" disabled={!selected.brand || loading}>
            <option value="">Välj modell</option>
            {models.map(m => (
              <option key={m.name} value={m.name}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* YEAR */}
        <div>
          <label className="block text-sm font-bold mb-2">Årsmodell</label>
          <select value={selected.year} onChange={handleYearChange} className="w-full p-3 rounded bg-gray-800 text-white" disabled={!selected.model || loading}>
            <option value="">Välj år</option>
            {years.map(y => (
              <option key={y.range} value={y.range}>{y.range}</option>
            ))}
          </select>
        </div>

        {/* ENGINE */}
        <div>
          <label className="block text-sm font-bold mb-2">Motor</label>
          <select value={selected.engine} onChange={handleEngineChange} className="w-full p-3 rounded bg-gray-800 text-white" disabled={!selected.year || loading}>
            <option value="">Välj motor</option>
            {engines.map(e => (
              <option key={e._id} value={e.label}>{e.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="flex justify-center my-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      )}

      {/* After Full Selection */}
      {selected.brand && selected.model && selected.year && selected.engine && (
        <div className="text-center mt-10">
          <h2 className="text-xl font-bold text-green-400 mb-4">Vald bil:</h2>
          <p className="text-white">{selected.brand} {selected.model} {selected.year} - {selected.engine}</p>
        </div>
      )}
    </div>
  );
}

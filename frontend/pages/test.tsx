// pages/test.tsx
import { useEffect, useState } from "react";
import Image from "next/image";

export default function TestPage() {
  const [brands, setBrands] = useState<any[]>([]);
  const [models, setModels] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [engines, setEngines] = useState<any[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  // 1. Hämta märken
  useEffect(() => {
    fetch("/api/brand")
      .then((res) => res.json())
      .then(setBrands);
  }, []);

  // 2. Hämta modeller
  useEffect(() => {
    if (selectedBrand) {
      fetch(`/api/model?brand=${selectedBrand}`)
        .then((res) => res.json())
        .then(setModels);
    }
  }, [selectedBrand]);

  // 3. Hämta år
  useEffect(() => {
    if (selectedModel) {
      fetch(`/api/year?model=${selectedModel}`)
        .then((res) => res.json())
        .then(setYears);
    }
  }, [selectedModel]);

  // 4. Hämta motorer
  useEffect(() => {
    if (selectedYear) {
      fetch(`/api/engine?year=${selectedYear}`)
        .then((res) => res.json())
        .then(setEngines);
    }
  }, [selectedYear]);

  return (
    <div className="p-6 space-y-12">
      {/* 1. Märken */}
      {!selectedBrand && (
        <div className="grid grid-cols-5 gap-4">
          {brands.map((brand) => (
            <div
              key={brand.slug}
              className="cursor-pointer hover:opacity-70 text-center"
              onClick={() => setSelectedBrand(brand.slug)}
            >
              {brand.image && (
                <Image
                  src={brand.image}
                  alt={brand.name}
                  width={80}
                  height={80}
                  className="mx-auto"
                />
              )}
              <p>{brand.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* 2. Modeller */}
      {selectedBrand && !selectedModel && (
        <div className="grid grid-cols-4 gap-4">
          {models.map((model) => (
            <div
              key={model.slug}
              className="cursor-pointer hover:opacity-70 text-center"
              onClick={() => setSelectedModel(model.slug)}
            >
              {model.image && (
                <Image
                  src={model.image}
                  alt={model.name}
                  width={100}
                  height={60}
                  className="mx-auto"
                />
              )}
              <p>{model.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* 3. År */}
      {selectedModel && !selectedYear && (
        <div className="grid grid-cols-3 gap-4">
          {years.map((year) => (
            <div
              key={year.slug}
              className="cursor-pointer border p-4 rounded text-center hover:bg-gray-100"
              onClick={() => setSelectedYear(year.slug)}
            >
              <p className="font-semibold">{year.name}</p>
              <p className="text-sm">{year.slug}</p>
            </div>
          ))}
        </div>
      )}

      {/* 4. Motorer */}
      {selectedYear && (
        <div className="grid grid-cols-2 gap-4">
          {engines.map((engine) => (
            <div
              key={engine.slug}
              className="border p-4 rounded text-center bg-white shadow"
            >
              <h3 className="font-semibold">{engine.name}</h3>
              <p className="text-sm">{engine.hp} hk</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

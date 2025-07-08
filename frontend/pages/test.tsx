import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/router";

type Engine = {
  _id: string;
  label: string;
};

type Year = {
  range: string;
  engines: Engine[];
};

type Model = {
  name: string;
  years: Year[];
};

type Brand = {
  _id: string;
  name: string;
  slug: string;
  logo?: {
    asset?: {
      url: string;
    };
    alt?: string;
  };
  models: Model[];
};

export default function TestPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);

  const router = useRouter();

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch("/api/brands");
        const data = await res.json();
        setBrands(data.result || []);
      } catch (error) {
        console.error("Failed to fetch brands", error);
      }
    };

    fetchBrands();
  }, []);

  const resetToBrand = () => {
    setSelectedModel(null);
    setSelectedYear(null);
  };

  const resetToModel = () => {
    setSelectedYear(null);
  };

  const handleEngineSelect = (engineId: string, engineLabel: string) => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;

    const path = `/${selectedBrand.slug}/${selectedModel.name}/${selectedYear.range}/${engineLabel}`;
    router.push(path);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-8 text-center">
        {selectedBrand
          ? selectedModel
            ? selectedYear
              ? "Välj motor"
              : "Välj årsmodell"
            : "Välj modell"
          : "Välj bilmärke"}
      </h1>

      {/* STEP 1: Brands */}
      {!selectedBrand && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {brands.map((brand) => (
            <div
              key={brand._id}
              className="bg-white shadow rounded p-4 text-center hover:shadow-md cursor-pointer"
              onClick={() => setSelectedBrand(brand)}
            >
              {brand.logo?.asset?.url ? (
                <Image
                  src={brand.logo.asset.url}
                  alt={brand.logo.alt || brand.name}
                  width={80}
                  height={80}
                  className="mx-auto mb-2 object-contain"
                />
              ) : (
                <div className="w-20 h-20 mx-auto mb-2 bg-gray-200 flex items-center justify-center text-sm font-medium rounded">
                  {brand.name}
                </div>
              )}
              <h2 className="text-lg font-semibold">{brand.name}</h2>
            </div>
          ))}
        </div>
      )}

      {/* STEP 2: Models */}
      {selectedBrand && !selectedModel && (
        <div>
          <button
            onClick={() => setSelectedBrand(null)}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Tillbaka till märken
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {selectedBrand.models.map((model, idx) => (
              <div
                key={idx}
                className="bg-white shadow rounded p-4 text-center hover:shadow-md cursor-pointer"
                onClick={() => setSelectedModel(model)}
              >
                <h3 className="text-md font-medium">{model.name}</h3>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: Years */}
      {selectedBrand && selectedModel && !selectedYear && (
        <div>
          <button
            onClick={resetToBrand}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Tillbaka till modeller
          </button>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {selectedModel.years.map((year, idx) => (
              <div
                key={idx}
                className="bg-white shadow rounded p-4 text-center hover:shadow-md cursor-pointer"
                onClick={() => setSelectedYear(year)}
              >
                <p className="text-md font-semibold">{year.range}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 4: Engines */}
      {selectedBrand && selectedModel && selectedYear && (
        <div>
          <button
            onClick={resetToModel}
            className="mb-4 text-blue-600 hover:underline"
          >
            ← Tillbaka till årsmodeller
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {selectedYear.engines.map((engine) => (
              <div
                key={engine._id}
                className="bg-white shadow rounded p-4 text-center hover:shadow-md cursor-pointer"
                onClick={() => handleEngineSelect(engine._id, engine.label)}
              >
                <p className="font-medium">{engine.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

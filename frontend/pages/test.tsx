// pages/test.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Image from "next/image";

interface Brand {
  _id: string;
  name: string;
  slug: string;
  logo?: {
    asset?: {
      url: string;
    };
    alt?: string;
  };
  models?: {
    name: string;
    years?: {
      range: string;
      engines?: {
        _id: string;
        label: string;
        fuel: string;
      }[];
    }[];
  }[];
}

export default function TestFlowPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data.result))
      .catch((err) => console.error("Failed to fetch brands", err));
  }, []);

  const handleBrandClick = (brand: Brand) => {
    setSelectedBrand(brand);
    setSelectedModel(null);
    setSelectedYear(null);
    setSelectedEngine(null);
  };

  const handleModelClick = (model: string) => {
    setSelectedModel(model);
    setSelectedYear(null);
    setSelectedEngine(null);
  };

  const handleYearClick = (year: string) => {
    setSelectedYear(year);
    setSelectedEngine(null);
  };

  const handleEngineClick = (engineLabel: string) => {
    setSelectedEngine(engineLabel);

    const brandSlug = selectedBrand?.slug || "";
    const modelSlug = selectedModel || "";
    const yearSlug = selectedYear || "";
    const engineSlug = engineLabel;

    router.push(`/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`);
  };

  if (!selectedBrand) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Välj bilmärke</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <div
              key={brand._id}
              className="border p-2 rounded hover:shadow cursor-pointer text-center"
              onClick={() => handleBrandClick(brand)}
            >
              {brand.logo?.asset?.url && (
                <Image
                  src={brand.logo.asset.url}
                  alt={brand.logo?.alt || brand.name}
                  width={80}
                  height={80}
                  className="mx-auto"
                />
              )}
              <p className="mt-2 font-semibold">{brand.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!selectedModel) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Välj modell</h1>
        <button className="text-blue-600 mb-4" onClick={() => setSelectedBrand(null)}>
          ← Tillbaka till märken
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {selectedBrand.models?.map((model) => (
            <div
              key={model.name}
              className="border p-2 rounded hover:shadow cursor-pointer text-center"
              onClick={() => handleModelClick(model.name)}
            >
              <p className="font-medium">{model.name}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentModel = selectedBrand.models?.find((m) => m.name === selectedModel);

  if (!selectedYear) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Välj årsmodell</h1>
        <button className="text-blue-600 mb-4" onClick={() => setSelectedModel(null)}>
          ← Tillbaka till modeller
        </button>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {currentModel?.years?.map((year) => (
            <div
              key={year.range}
              className="border p-2 rounded hover:shadow cursor-pointer text-center"
              onClick={() => handleYearClick(year.range)}
            >
              <p className="font-medium">{year.range}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentYear = currentModel?.years?.find((y) => y.range === selectedYear);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Välj motor</h1>
      <button className="text-blue-600 mb-4" onClick={() => setSelectedYear(null)}>
        ← Tillbaka till år
      </button>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {currentYear?.engines?.map((engine) => (
          <div
            key={engine._id}
            className="border p-2 rounded hover:shadow cursor-pointer text-center"
            onClick={() => handleEngineClick(engine.label)}
          >
            <p className="font-medium">{engine.label}</p>
            <p className="text-sm text-gray-500">{engine.fuel}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

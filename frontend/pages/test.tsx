import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

interface Brand {
  name: string;
  slug: string;
  logo?: {
    asset: { url: string };
    alt?: string;
  };
}

interface Model {
  name: string;
  slug: string;
}

interface Year {
  range: string;
  slug: string;
}

interface Engine {
  label: string;
  slug: string;
  stages: {
    name: string;
    tunedHk?: number;
    tunedNm?: number;
    price?: number;
  }[];
}

export default function TestPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data.result || []));
  }, []);

  useEffect(() => {
    if (!selectedBrand) return;
    fetch(`/api/models?brand=${selectedBrand.slug}`)
      .then((res) => res.json())
      .then((data) => setModels(data.result || []));
  }, [selectedBrand]);

  useEffect(() => {
    if (!selectedBrand || !selectedModel) return;
    fetch(`/api/years?brand=${selectedBrand.slug}&model=${selectedModel.slug}`)
      .then((res) => res.json())
      .then((data) => setYears(data.result || []));
  }, [selectedModel]);

  useEffect(() => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    fetch(
      `/api/engines?brand=${selectedBrand.slug}&model=${selectedModel.slug}&year=${selectedYear.range}`,
    )
      .then((res) => res.json())
      .then((data) => setEngines(data.result || []));
  }, [selectedYear]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <h1 className="text-3xl font-bold">Test: Motoröversikt</h1>

      {/* Brand selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">1. Välj bilmärke</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {brands.map((brand) => (
            <button
              key={brand.slug}
              onClick={() => {
                setSelectedBrand(brand);
                setSelectedModel(null);
                setSelectedYear(null);
                setEngines([]);
              }}
              className={`border rounded-md p-2 text-center hover:bg-gray-100 ${
                selectedBrand?.slug === brand.slug ? "border-blue-500" : ""
              }`}
            >
              {brand.logo?.asset?.url && (
                <div className="relative w-full h-16 mb-1">
                  <Image
                    src={brand.logo.asset.url}
                    alt={brand.logo.alt || brand.name}
                    fill
                    style={{ objectFit: "contain" }}
                  />
                </div>
              )}
              <p>{brand.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Model selection */}
      {selectedBrand && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">2. Välj modell</h2>
          <div className="flex flex-wrap gap-2">
            {models.map((model) => (
              <button
                key={model.slug}
                onClick={() => {
                  setSelectedModel(model);
                  setSelectedYear(null);
                  setEngines([]);
                }}
                className={`px-4 py-2 rounded-md border hover:bg-gray-100 ${
                  selectedModel?.slug === model.slug ? "border-blue-500" : ""
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Year selection */}
      {selectedModel && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">3. Välj årsmodell</h2>
          <div className="flex flex-wrap gap-2">
            {years.map((year) => (
              <button
                key={year.slug}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-md border hover:bg-gray-100 ${
                  selectedYear?.slug === year.slug ? "border-blue-500" : ""
                }`}
              >
                {year.range}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Engine output */}
      {selectedYear && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">4. Tillgängliga motorer</h2>
          {engines.map((engine) => (
            <div
              key={engine.slug}
              className="border rounded-md p-4 space-y-2 bg-white shadow"
            >
              <h3 className="text-lg font-semibold">{engine.label}</h3>
              <ul className="list-disc pl-5">
                {engine.stages?.map((stage, i) => (
                  <li key={i}>
                    {stage.name} – {stage.tunedHk || "?"} hk /{" "}
                    {stage.tunedNm || "?"} Nm – {stage.price?.toLocaleString()} kr
                  </li>
                ))}
              </ul>
              <Link
                href={`/${selectedBrand.slug}/${selectedModel.slug}/${selectedYear.slug}/${engine.slug}`}
                className="inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
              >
                Se detaljer
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// pages/test.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

type Brand = {
  name: string;
  slug: string;
  logo?: {
    asset: {
      url: string;
    };
    alt?: string;
  };
};

type Model = {
  name: string;
  slug: string;
};

type Year = {
  range: string;
  slug: string;
};

type Engine = {
  label: string;
  slug: string;
};

export default function TestPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data.result || []));
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetch(`/api/models?brand=${encodeURIComponent(selectedBrand)}`)
        .then((res) => res.json())
        .then((data) => setModels(data.result || []));
    } else {
      setModels([]);
    }
    setYears([]);
    setEngines([]);
    setSelectedModel(null);
    setSelectedYear(null);
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetch(
        `/api/years?brand=${encodeURIComponent(
          selectedBrand,
        )}&model=${encodeURIComponent(selectedModel)}`,
      )
        .then((res) => res.json())
        .then((data) => setYears(data.result || []));
    } else {
      setYears([]);
    }
    setEngines([]);
    setSelectedYear(null);
  }, [selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      fetch(
        `/api/engines?brand=${encodeURIComponent(
          selectedBrand,
        )}&model=${encodeURIComponent(
          selectedModel,
        )}&year=${encodeURIComponent(selectedYear)}`,
      )
        .then((res) => res.json())
        .then((data) => setEngines(data.result || []));
    } else {
      setEngines([]);
    }
  }, [selectedYear]);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const navigateToEngine = (engineSlug: string) => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;

    const brandSlug = slugify(selectedBrand);
    const modelSlug = slugify(selectedModel);
    const yearSlug = slugify(selectedYear);
    const engineSlugFinal = slugify(engineSlug);

    router.push(`/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlugFinal}`);
  };

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Test Navigering</h1>

      <div className="space-y-4">
        {/* Step 1: Brand */}
        <select
          value={selectedBrand || ""}
          onChange={(e) => setSelectedBrand(e.target.value)}
          className="w-full p-2 border"
        >
          <option value="">Välj märke</option>
          {brands.map((b) => (
            <option key={b.slug} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        {/* Step 2: Model */}
        {models.length > 0 && (
          <select
            value={selectedModel || ""}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border"
          >
            <option value="">Välj modell</option>
            {models.map((m) => (
              <option key={m.slug} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        )}

        {/* Step 3: Year */}
        {years.length > 0 && (
          <select
            value={selectedYear || ""}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full p-2 border"
          >
            <option value="">Välj årsmodell</option>
            {years.map((y) => (
              <option key={y.slug} value={y.range}>
                {y.range}
              </option>
            ))}
          </select>
        )}

        {/* Step 4: Engine */}
        {engines.length > 0 && (
          <select
            onChange={(e) => navigateToEngine(e.target.value)}
            className="w-full p-2 border"
          >
            <option value="">Välj motor</option>
            {engines.map((e) => (
              <option key={e.slug} value={e.label}>
                {e.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

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
  fuel: string;
};

export default function TestPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [engines, setEngines] = useState<Engine[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  useEffect(() => {
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => setBrands(data.result || []));
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      fetch(`/api/models?brand=${encodeURIComponent(selectedBrand.name)}`)
        .then((res) => res.json())
        .then((data) => setModels(data.result || []));
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) {
      fetch(
        `/api/years?brand=${encodeURIComponent(
          selectedBrand.name,
        )}&model=${encodeURIComponent(selectedModel.name)}`,
      )
        .then((res) => res.json())
        .then((data) => setYears(data.result || []));
    }
  }, [selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      fetch(
        `/api/engines?brand=${encodeURIComponent(
          selectedBrand.name,
        )}&model=${encodeURIComponent(
          selectedModel.name,
        )}&year=${encodeURIComponent(selectedYear.range)}`,
      )
        .then((res) => res.json())
        .then((data) => setEngines(data.result || []));
    }
  }, [selectedYear]);

  const goToEnginePage = (engineLabel: string) => {
    if (!selectedBrand || !selectedModel || !selectedYear) return;
    const brandSlug = slugify(selectedBrand.slug || selectedBrand.name);
    const modelSlug = slugify(selectedModel.slug || selectedModel.name);
    const yearSlug = slugify(selectedYear.slug || selectedYear.range);
    const engineSlug = slugify(engineLabel);

    router.push(`/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`);
  };

  const Card = ({
    label,
    imageUrl,
    onClick,
  }: {
    label: string;
    imageUrl?: string;
    onClick: () => void;
  }) => (
    <div
      onClick={onClick}
      className="cursor-pointer border rounded-lg shadow-sm hover:shadow-lg p-4 flex flex-col items-center justify-center bg-white hover:bg-gray-50 transition"
    >
      {imageUrl && (
        <img src={imageUrl} alt={label} className="h-16 object-contain mb-2" />
      )}
      <p className="text-center text-sm font-medium">{label}</p>
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="mb-4 inline-block text-sm text-blue-600 hover:underline"
    >
      ← Tillbaka
    </button>
  );

  const enginesByFuel = (fuelType: string) =>
    engines.filter((e) =>
      e.fuel.toLowerCase().includes(fuelType.toLowerCase()),
    );

  const enginesOther = engines.filter(
    (e) =>
      !e.fuel.toLowerCase().includes("diesel") &&
      !e.fuel.toLowerCase().includes("bensin"),
  );

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Välj din bil</h1>

      {/* STEP 1: BRAND */}
      {!selectedBrand && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {brands.map((brand) => (
            <Card
              key={brand.slug}
              label={brand.name}
              imageUrl={brand.logo?.asset.url}
              onClick={() => setSelectedBrand(brand)}
            />
          ))}
        </div>
      )}

      {/* STEP 2: MODEL */}
      {selectedBrand && !selectedModel && (
        <>
          <BackButton onClick={() => setSelectedBrand(null)} />
          <h2 className="text-xl font-semibold mb-4">Välj modell</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {models.map((model) => (
              <Card
                key={model.slug}
                label={model.name}
                onClick={() => setSelectedModel(model)}
              />
            ))}
          </div>
        </>
      )}

      {/* STEP 3: YEAR */}
      {selectedBrand && selectedModel && !selectedYear && (
        <>
          <BackButton onClick={() => setSelectedModel(null)} />
          <h2 className="text-xl font-semibold mb-4">Välj årsmodell</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {years.map((year) => (
              <Card
                key={year.slug}
                label={year.range}
                onClick={() => setSelectedYear(year)}
              />
            ))}
          </div>
        </>
      )}

      {/* STEP 4: ENGINE */}
      {selectedBrand && selectedModel && selectedYear && (
        <>
          <BackButton onClick={() => setSelectedYear(null)} />
          <h2 className="text-xl font-semibold mb-4">Välj motor</h2>

          {/* Diesel */}
          {enginesByFuel("diesel").length > 0 && (
            <>
              <h3 className="text-md font-medium mb-2 mt-4 text-gray-600">
                Diesel
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enginesByFuel("diesel").map((engine) => (
                  <Card
                    key={engine.slug}
                    label={engine.label}
                    onClick={() => goToEnginePage(engine.label)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Bensin */}
          {enginesByFuel("bensin").length > 0 && (
            <>
              <h3 className="text-md font-medium mb-2 mt-4 text-gray-600">
                Bensin
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enginesByFuel("bensin").map((engine) => (
                  <Card
                    key={engine.slug}
                    label={engine.label}
                    onClick={() => goToEnginePage(engine.label)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Other */}
          {enginesOther.length > 0 && (
            <>
              <h3 className="text-md font-medium mb-2 mt-4 text-gray-600">
                Övrigt
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {enginesOther.map((engine) => (
                  <Card
                    key={engine.slug}
                    label={engine.label}
                    onClick={() => goToEnginePage(engine.label)}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

// pages/test.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

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
  const [allModels, setAllModels] = useState<any[]>([]);

  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [selectedModel, setSelectedModel] = useState<Model | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year | null>(null);
  const [isLoading, setIsLoading] = useState({
    brands: true,
    models: false,
    years: false,
    engines: false,
  });

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  useEffect(() => {
    setIsLoading((prev) => ({ ...prev, brands: true }));
    fetch("/api/brands")
      .then((res) => res.json())
      .then((data) => {
        setBrands(data.result || []);
        setIsLoading((prev) => ({ ...prev, brands: false }));
      });
  }, []);

  useEffect(() => {
    fetch("/data/all_models.json")
      .then((res) => res.json())
      .then((data) => {
        setAllModels(data);
      })
      .catch((err) => console.error("Fel vid inläsning av modellbilder:", err));
  }, []);

  useEffect(() => {
    if (selectedBrand) {
      setIsLoading((prev) => ({ ...prev, models: true }));
      fetch(`/api/models?brand=${encodeURIComponent(selectedBrand.name)}`)
        .then((res) => res.json())
        .then((data) => {
          setModels(data.result || []);
          setIsLoading((prev) => ({ ...prev, models: false }));
        });
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedBrand && selectedModel) {
      setIsLoading((prev) => ({ ...prev, years: true }));
      fetch(
        `/api/years?brand=${encodeURIComponent(
          selectedBrand.name,
        )}&model=${encodeURIComponent(selectedModel.name)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setYears(data.result || []);
          setIsLoading((prev) => ({ ...prev, years: false }));
        });
    }
  }, [selectedModel]);

  useEffect(() => {
    if (selectedBrand && selectedModel && selectedYear) {
      setIsLoading((prev) => ({ ...prev, engines: true }));
      fetch(
        `/api/engines?brand=${encodeURIComponent(
          selectedBrand.name,
        )}&model=${encodeURIComponent(
          selectedModel.name,
        )}&year=${encodeURIComponent(selectedYear.range)}`,
      )
        .then((res) => res.json())
        .then((data) => {
          setEngines(data.result || []);
          setIsLoading((prev) => ({ ...prev, engines: false }));
        });
    }
  }, [selectedYear]);

  const getModelImage = (
    modelName: string,
    brandName: string,
  ): string | undefined => {
    return allModels.find(
      (m) =>
        m.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(modelName.toLowerCase().replace(/\s+/g, "")) &&
        m.brand.toLowerCase() === brandName.toLowerCase(),
    )?.image_url;
  };

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
    isSelected = false,
    isLoading = false,
  }: {
    label: string;
    imageUrl?: string;
    onClick: () => void;
    isSelected?: boolean;
    isLoading?: boolean;
  }) => (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center transition-all duration-200
        ${isSelected ? "bg-blue-600 text-white" : "bg-white hover:bg-gray-50 border border-gray-200"}
        ${isLoading ? "animate-pulse" : ""}
        shadow-sm hover:shadow-md`}
    >
      {isLoading ? (
        <div className="h-16 w-16 bg-gray-200 rounded-full mb-2"></div>
      ) : imageUrl ? (
        <img
          src={imageUrl}
          alt={label}
          className="h-16 w-auto object-contain mb-2"
          loading="lazy"
        />
      ) : (
        <div className="h-16 w-16 bg-gray-100 rounded-full mb-2 flex items-center justify-center">
          <span className="text-gray-400 text-2xl font-bold">
            {label.charAt(0)}
          </span>
        </div>
      )}
      <p
        className={`text-center font-medium ${isSelected ? "text-white" : "text-gray-800"}`}
      >
        {label}
      </p>
    </div>
  );

  const BackButton = ({ onClick }: { onClick: () => void }) => (
    <button
      onClick={onClick}
      className="flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors"
    >
      <svg
        className="w-5 h-5 mr-1"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M10 19l-7-7m0 0l7-7m-7 7h18"
        />
      </svg>
      Tillbaka
    </button>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="flex items-center mb-4">
      <h2 className="text-xl font-bold text-gray-800">{title}</h2>
      <div className="ml-2 h-px bg-gray-300 flex-1"></div>
    </div>
  );

  const FuelTypeHeader = ({ title }: { title: string }) => (
    <h3 className="text-md font-semibold mb-3 mt-6 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
      {title}
    </h3>
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
    <>
      <Head>
        <title>Välj din bil | AK-TUNING</title>
        <meta
          name="description"
          content="Välj din bilmodell för att se tillgängliga optimeringsalternativ"
        />
      </Head>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VÄLJ DIN BIL
          </h1>
          <p className="text-gray-600">
            Välj bilmärke, modell, årsmodell och motor för att se tillgängliga
            optimeringsalternativ
          </p>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center text-sm text-gray-500 mb-8">
          <span className={!selectedBrand ? "font-medium text-blue-600" : ""}>
            Bilmärke
          </span>
          {selectedBrand && (
            <>
              <svg
                className="w-4 h-4 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span
                className={!selectedModel ? "font-medium text-blue-600" : ""}
              >
                Modell
              </span>
            </>
          )}
          {selectedModel && (
            <>
              <svg
                className="w-4 h-4 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span
                className={!selectedYear ? "font-medium text-blue-600" : ""}
              >
                Årsmodell
              </span>
            </>
          )}
          {selectedYear && (
            <>
              <svg
                className="w-4 h-4 mx-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              <span className="font-medium text-blue-600">Motor</span>
            </>
          )}
        </div>

        {/* STEP 1: BRAND */}
        {!selectedBrand && (
          <>
            <SectionHeader title="Välj bilmärke" />
            {isLoading.brands ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Card
                    key={i}
                    label="Laddar..."
                    isLoading={true}
                    onClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
          </>
        )}

        {/* STEP 2: MODEL */}
        {selectedBrand && !selectedModel && (
          <>
            <BackButton onClick={() => setSelectedBrand(null)} />
            <SectionHeader title={`Välj ${selectedBrand.name} modell`} />
            {isLoading.models ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card
                    key={i}
                    label="Laddar..."
                    isLoading={true}
                    onClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {models.map((model) => (
                  <Card
                    key={model.slug}
                    label={model.name}
                    imageUrl={getModelImage(model.name, selectedBrand.name)}
                    onClick={() => setSelectedModel(model)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP 3: YEAR */}
        {selectedBrand && selectedModel && !selectedYear && (
          <>
            <BackButton onClick={() => setSelectedModel(null)} />
            <SectionHeader
              title={`Välj årsmodell för ${selectedBrand.name} ${selectedModel.name}`}
            />
            {isLoading.years ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <Card
                    key={i}
                    label="Laddar..."
                    isLoading={true}
                    onClick={() => {}}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {years.map((year) => (
                  <Card
                    key={year.slug}
                    label={year.range}
                    onClick={() => setSelectedYear(year)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* STEP 4: ENGINE */}
        {selectedBrand && selectedModel && selectedYear && (
          <>
            <BackButton onClick={() => setSelectedYear(null)} />
            <SectionHeader
              title={`Välj motor för ${selectedBrand.name} ${selectedModel.name} ${selectedYear.range}`}
            />

            {isLoading.engines ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <Card
                      key={i}
                      label="Laddar..."
                      isLoading={true}
                      onClick={() => {}}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Diesel */}
                {enginesByFuel("diesel").length > 0 && (
                  <div>
                    <FuelTypeHeader title="Diesel" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {enginesByFuel("diesel").map((engine) => (
                        <Card
                          key={engine.slug}
                          label={engine.label}
                          onClick={() => goToEnginePage(engine.label)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Bensin */}
                {enginesByFuel("bensin").length > 0 && (
                  <div>
                    <FuelTypeHeader title="Bensin" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {enginesByFuel("bensin").map((engine) => (
                        <Card
                          key={engine.slug}
                          label={engine.label}
                          onClick={() => goToEnginePage(engine.label)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Other */}
                {enginesOther.length > 0 && (
                  <div>
                    <FuelTypeHeader title="Övriga motorer" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      {enginesOther.map((engine) => (
                        <Card
                          key={engine.slug}
                          label={engine.label}
                          onClick={() => goToEnginePage(engine.label)}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

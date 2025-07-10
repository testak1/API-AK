// pages/index.tsx
import Head from "next/head";
import React, {useEffect, useState, useRef, useMemo} from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
} from "chart.js";
import dynamic from "next/dynamic";
import {PortableText} from "@portabletext/react";
import {urlFor} from "@/lib/sanity";
import PublicLanguageDropdown from "@/components/PublicLanguageSwitcher";
import {t as translate} from "@/lib/translations";
import type {
  Brand,
  Stage,
  AktPlusOption,
  AktPlusOptionReference,
} from "@/types/sanity";
import ContactModal from "@/components/ContactModal";
import {link} from "fs";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend
);

interface SelectionState {
  brand: string;
  model: string;
  year: string;
  engine: string;
}

interface Slug {
  _type: "slug";
  current: string;
}

export default function TuningViewer() {
  const [data, setData] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<SelectionState>({
    brand: "",
    model: "",
    year: "",
    engine: "",
  });

  const translateStageName = (lang: string, name: string): string => {
    const match = name.match(/Steg\s?(\d+)/i);
    if (!match) return name;

    const stageNum = match[1];
    const translations: Record<string, string> = {
      sv: `Steg ${stageNum}`,
      en: `Stage ${stageNum}`,
      de: `Stufe ${stageNum}`,
      fr: `Niveau ${stageNum}`,
      it: `Fase ${stageNum}`,
      da: `Stadie ${stageNum}`,
      no: `Trinn ${stageNum}`,
    };

    return translations[lang] || name;
  };

  const [viewMode, setViewMode] = useState<"dropdown" | "cards">("dropdown");

  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {}
  );
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [expandedOptions, setExpandedOptions] = useState<
    Record<string, boolean>
  >({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState("sv");

  const [contactModalData, setContactModalData] = useState<{
    isOpen: boolean;
    stageOrOption: string;
    link: string;
    scrollPosition?: number;
  }>({
    isOpen: false,
    stageOrOption: "",
    link: "",
  });

  const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), {
    ssr: false, // Disable server-side rendering for this component
    loading: () => (
      <div className="h-96 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
        <p className="text-gray-400">Laddar dynobild...</p>
      </div>
    ),
  });

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }>({open: false, type: "stage"});

  const getStageColor = (stageName: string) => {
    const name = stageName.toLowerCase();
    if (name.includes("steg 1")) return "text-red-500";
    if (name.includes("steg 2")) return "text-orange-400";
    if (name.includes("steg 3")) return "text-purple-400";
    if (name.includes("steg 4")) return "text-yellow-400";
    if (name.includes("dsg")) return "text-blue-400";
    return "text-white"; // fallback
  };

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const slugifyStage = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

  const [allModels, setAllModels] = useState<any[]>([]);

  useEffect(() => {
    fetch("/data/all_models.json")
      .then(res => res.json())
      .then(data => {
        setAllModels(data);
      })
      .catch(err => console.error("Fel vid inläsning av modellbilder:", err));
  }, []);

  const getModelImage = (
    modelName: string,
    brandName: string
  ): string | undefined => {
    return allModels.find(
      m =>
        m.name
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(modelName.toLowerCase().replace(/\s+/g, "")) &&
        m.brand.toLowerCase() === brandName.toLowerCase()
    )?.image_url;
  };

  const handleBookNow = (
    stageOrOptionName: string,
    event?: React.MouseEvent
  ) => {
    const selectedBrand = data.find(b => b.name === selected.brand);
    if (!selectedBrand) return;

    const brandSlug =
      selectedBrand.slug?.current || slugify(selectedBrand.name);

    const selectedModel = selectedBrand.models?.find(
      m => m.name === selected.model
    );
    if (!selectedModel) return;

    const modelSlug =
      typeof selectedModel.slug === "object"
        ? selectedModel.slug.current
        : selectedModel.slug || slugify(selectedModel.name);

    const selectedYear = selectedModel.years?.find(
      y => y.range === selected.year
    );
    if (!selectedYear) return;

    const yearSlug = selectedYear.range.includes(" ")
      ? slugify(selectedYear.range)
      : selectedYear.range;

    const selectedEngine = selectedYear.engines?.find(
      e => e.label === selected.engine
    );
    if (!selectedEngine) return;

    const engineSlug = selectedEngine.label.includes(" ")
      ? slugify(selectedEngine.label)
      : selectedEngine.label;

    const stageSlug = slugifyStage(stageOrOptionName);

    const finalLink = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}#${stageSlug}`;

    const clickY = event?.clientY || 0;
    const scrollY = window.scrollY + clickY;

    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    setContactModalData({
      isOpen: true,
      stageOrOption: stageOrOptionName,
      link: finalLink,
      scrollPosition: isMobile ? undefined : 0,
    });
    window.parent.postMessage({scrollToIframe: true}, "*");
  };

  // Hämta språk från localStorage om det finns
  useEffect(() => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
      setCurrentLanguage(storedLang);
    }
  }, []);

  // Spara språk till localStorage när det ändras
  useEffect(() => {
    localStorage.setItem("lang", currentLanguage);
  }, [currentLanguage]);

  // Load watermark image
  useEffect(() => {
    const img = new Image();
    img.src = "/ak-logo.png";
    img.onload = () => {
      watermarkImageRef.current = img;
    };
  }, []);

  // Fetch brands and models
  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch("/api/brands");
        if (!res.ok) throw new Error("Failed to fetch brands");
        const json = await res.json();
        setData(json.result || []);
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchBrands();
  }, []);

  // Fetch years
  useEffect(() => {
    const fetchYears = async () => {
      if (selected.brand && selected.model) {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/years?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}`
          );
          if (!res.ok) throw new Error("Failed to fetch years");
          const years = await res.json();

          setData(prev =>
            prev.map(brand =>
              brand.name !== selected.brand
                ? brand
                : {
                    ...brand,
                    models: brand.models.map(model =>
                      model.name !== selected.model
                        ? model
                        : {...model, years: years.result}
                    ),
                  }
            )
          );
        } catch (error) {
          console.error("Error fetching years:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchYears();
  }, [selected.brand, selected.model]);

  // Fetch engines
  useEffect(() => {
    const fetchEngines = async () => {
      if (selected.brand && selected.model && selected.year) {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/engines?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}&year=${encodeURIComponent(selected.year)}&lang=${currentLanguage}`
          );
          if (!res.ok) throw new Error("Failed to fetch engines");
          const engines = await res.json();

          setData(prev =>
            prev.map(brand =>
              brand.name !== selected.brand
                ? brand
                : {
                    ...brand,
                    models: brand.models.map(model =>
                      model.name !== selected.model
                        ? model
                        : {
                            ...model,
                            years: model.years.map(year =>
                              year.range !== selected.year
                                ? year
                                : {...year, engines: engines.result}
                            ),
                          }
                    ),
                  }
            )
          );
        } catch (error) {
          console.error("Error fetching engines:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchEngines();
  }, [selected.brand, selected.model, selected.year]);
  const {
    brands,
    models,
    years,
    engines,
    selectedEngine,
    stages,
    groupedEngines,
  } = useMemo(() => {
    const brands = data.map(b => b.name);
    const models = data.find(b => b.name === selected.brand)?.models || [];
    const years = models.find(m => m.name === selected.model)?.years || [];
    const engines = years.find(y => y.range === selected.year)?.engines || [];
    const selectedEngine = engines.find(e => e.label === selected.engine);
    const stages = selectedEngine?.stages || [];

    const groupedEngines = engines.reduce(
      (acc, engine) => {
        const fuelType = engine.fuel;
        if (!acc[fuelType]) acc[fuelType] = [];
        acc[fuelType].push(engine);
        return acc;
      },
      {} as Record<string, typeof engines>
    );

    return {
      brands,
      models,
      years,
      engines,
      selectedEngine,
      stages,
      groupedEngines,
    };
  }, [data, selected]);

  useEffect(() => {
    if (stages.length > 0) {
      const initialExpandedStates = stages.reduce(
        (acc, stage) => {
          acc[stage.name] = stage.name === "Steg 1";
          return acc;
        },
        {} as Record<string, boolean>
      );
      setExpandedStages(initialExpandedStates);
    }
  }, [stages]);

  const watermarkPlugin = {
    id: "watermark",
    beforeDraw: (chart: ChartJS) => {
      const ctx = chart.ctx;
      const {
        chartArea: {top, left, width, height},
      } = chart;

      if (watermarkImageRef.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.2;

        const img = watermarkImageRef.current;
        const ratio = img.width / img.height;

        // Adjust size based on screen width
        const isMobile = window.innerWidth <= 768;
        const imgWidth = isMobile ? width * 0.8 : width * 0.4;
        const imgHeight = imgWidth / ratio;

        const x = left + width / 2 - imgWidth / 2;
        const y = top + height / 2 - imgHeight / 2;

        ctx.drawImage(img, x, y, imgWidth, imgHeight);
        ctx.restore();
      }
    },
  };
  const shadowPlugin = {
    id: "shadowPlugin",
    beforeDatasetDraw(chart: ChartJS, args: any, options: any) {
      const {ctx} = chart;
      const dataset = chart.data.datasets[args.index];

      ctx.save();
      ctx.shadowColor = dataset.borderColor as string;
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    },
    afterDatasetDraw(chart: ChartJS, args: any, options: any) {
      chart.ctx.restore();
    },
  };

  const isExpandedAktPlusOption = (item: any): item is AktPlusOption => {
    return item && "_id" in item && "title" in item;
  };

  const getAllAktPlusOptions = useMemo(
    () => (stage: Stage) => {
      if (!selectedEngine) return [];

      const combinedOptions: AktPlusOptionReference[] = [
        ...(selectedEngine.globalAktPlusOptions || []),
        ...(stage.aktPlusOptions || []),
      ];

      const uniqueOptionsMap = new Map<string, AktPlusOption>();

      (combinedOptions as AktPlusOptionReference[])
        .filter(isExpandedAktPlusOption)
        .forEach(opt => {
          if (
            (opt.isUniversal ||
              opt.applicableFuelTypes?.includes(selectedEngine.fuel) ||
              opt.manualAssignments?.some(
                ref => ref._ref === selectedEngine._id
              )) &&
            (!opt.stageCompatibility || opt.stageCompatibility === stage.name)
          ) {
            uniqueOptionsMap.set(opt._id, opt);
          }
        });

      return Array.from(uniqueOptionsMap.values());
    },
    [selectedEngine]
  );

  const generateDynoCurve = (
    peakValue: number,
    isHp: boolean,
    fuelType: string
  ) => {
    const rpmRange = fuelType.toLowerCase().includes("diesel")
      ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
      : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

    const peakIndex = isHp
      ? Math.floor(rpmRange.length * 0.6)
      : Math.floor(rpmRange.length * 0.4);
    const startIndex = 0;

    return rpmRange.map(rpm => {
      const startRpm = rpmRange[startIndex];
      const peakRpm = rpmRange[peakIndex];
      const endRpm = rpmRange[rpmRange.length - 1];

      if (rpm <= peakRpm) {
        const progress = (rpm - startRpm) / (peakRpm - startRpm);
        return peakValue * (0.5 + 0.5 * Math.pow(progress, 1.2));
      } else {
        const fallProgress = (rpm - peakRpm) / (endRpm - peakRpm);
        return peakValue * (1 - 0.35 * Math.pow(fallProgress, 1));
      }
    });
  };

  const rpmLabels = selectedEngine?.fuel?.toLowerCase().includes("diesel")
    ? ["1500", "2000", "2500", "3000", "3500", "4000", "4500", "5000"]
    : [
        "2000",
        "2500",
        "3000",
        "3500",
        "4000",
        "4500",
        "5000",
        "5500",
        "6000",
        "6500",
        "7000",
      ];

  const toggleStage = (stageName: string) => {
    setExpandedStages(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = key === stageName ? !prev[key] : false;
      });
      return newState;
    });
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptions(prev => {
      const newState: Record<string, boolean> = {};
      newState[optionId] = !prev[optionId];
      return newState;
    });
  };
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected({brand: e.target.value, model: "", year: "", engine: ""});
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({
      ...prev,
      model: e.target.value,
      year: "",
      engine: "",
    }));
  };

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({...prev, year: e.target.value, engine: ""}));
  };

  const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected(prev => ({...prev, engine: e.target.value}));
  };

  const portableTextComponents = {
    types: {
      image: ({value}: any) => (
        <img
          src={urlFor(value).width(100).url()}
          alt={value.alt || ""}
          className="my-4 rounded-lg shadow-md"
        />
      ),
    },
    marks: {
      link: ({children, value}: any) => (
        <a
          href={value.href}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {children}
        </a>
      ),
    },
  };

  const [allAktPlusOptions, setAllAktPlusOptions] = useState<AktPlusOption[]>(
    []
  );

  useEffect(() => {
    const fetchAktPlusOptions = async () => {
      try {
        const res = await fetch(`/api/aktplus-options?lang=${currentLanguage}`);
        const json = await res.json();
        setAllAktPlusOptions(json.options || []);
      } catch (err) {
        console.error("Kunde inte hämta AKT+ alternativ", err);
      }
    };

    fetchAktPlusOptions();
  }, [currentLanguage]);

  const [expandedAktPlus, setExpandedAktPlus] = useState<
    Record<string, boolean>
  >({});

  const toggleAktPlus = (stageName: string) => {
    setExpandedAktPlus(prev => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

  return (
    <>
      <Head>
        <title>
          AK-TUNING | Skräddarsydd Motoroptimering beprövat på vår dyno |
          Göteborg - Stockholm - Skåne - Jönköping - Örebro
        </title>
        <meta
          name="description"
          content="Skräddarsydd Motoroptimering – Effektökning, bränslebesparing & trygg mjukvara. AK-TUNING finns i Göteborg - Stockholm - Skåne - Jönköping - Örebro"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          property="og:title"
          content="AK-TUNING | Motoroptimering i Göteborg - Stockholm - Skåne - Jönköping - Örebro"
        />
        <meta
          property="og:description"
          content="Skräddarsydd Motoroptimering – Effektökning, bränslebesparing & trygg mjukvara. AK-TUNING finns i Göteborg - Stockholm - Skåne - Jönköping - Örebro"
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tuning.aktuning.se" />
        <meta
          property="og:image"
          content="https://tuning.aktuning.se/ak-logo1.png"
        />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AK-TUNING – Marknadsledande på Motoroptimering",
              url: "https://tuning.aktuning.se",
              logo: "https://tuning.aktuning.se/ak-logo1.png",
            }),
          }}
        />
      </Head>

      <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
        <div className="flex items-center justify-between mb-4">
          <img
            src="/ak-logo-svart.png"
            fetchPriority="high"
            alt="AK-TUNING"
            style={{height: "80px", cursor: "pointer"}}
            className="h-auto max-h-20 w-auto max-w-[500px] object-contain"
            loading="lazy"
            onClick={() => window.location.reload()}
          />
          <PublicLanguageDropdown
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />

          <button
            onClick={() =>
              setViewMode(viewMode === "dropdown" ? "cards" : "dropdown")
            }
            className="p-2 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors"
            title={
              viewMode === "dropdown"
                ? "Switch to card view"
                : "Switch to dropdown view"
            }
          >
            {viewMode === "dropdown" ? (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
            )}
          </button>
        </div>

        <div className="mb-4">
          <p className="text-black text-center text-lg font-semibold">
            {translate(currentLanguage, "headline")}
          </p>
        </div>
        {viewMode === "dropdown" ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
            <div>
              <label
                htmlFor="brand"
                className="block text-sm font-bold text-black mb-1"
              >
                {translate(currentLanguage, "BrandValue")}
              </label>
              <select
                id="brand"
                name="brand"
                className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  isLoading
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-gray-600"
                }`}
                value={selected.brand}
                onChange={handleBrandChange}
                disabled={isLoading}
              >
                <option value="">
                  {translate(currentLanguage, "selectBrand")}
                </option>
                {[...brands]
                  .filter(b => !b.startsWith("[LASTBIL]"))
                  .sort((a, b) => a.localeCompare(b))
                  .concat(
                    brands
                      .filter(b => b.startsWith("[LASTBIL]"))
                      .sort((a, b) => a.localeCompare(b))
                  )
                  .map(brand => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="model"
                className="block text-sm font-bold text-black mb-1"
              >
                {translate(currentLanguage, "ModelValue")}
              </label>
              <select
                id="model"
                name="model"
                className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  !selected.brand
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-gray-600"
                }`}
                value={selected.model}
                onChange={handleModelChange}
                disabled={!selected.brand}
              >
                <option value="">
                  {translate(currentLanguage, "selectModel")}
                </option>
                {models.map(model => (
                  <div
                    key={model.name}
                    onClick={() =>
                      setSelected(prev => ({
                        ...prev,
                        model: model.name,
                        year: "",
                        engine: "",
                      }))
                    }
                    className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                  >
                    {getModelImage(model.name, selected.brand) && (
                      <img
                        src={getModelImage(model.name, selected.brand)}
                        alt={model.name}
                        className="h-16 w-auto object-contain mb-2"
                      />
                    )}
                    <p className="text-center font-medium text-gray-800">
                      {model.name}
                    </p>
                  </div>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="year"
                className="block text-sm font-bold text-black mb-1"
              >
                {translate(currentLanguage, "YearValue")}
              </label>
              <select
                id="year"
                name="year"
                className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  !selected.model
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-gray-600"
                }`}
                value={selected.year}
                onChange={handleYearChange}
                disabled={!selected.model}
              >
                <option value="">
                  {translate(currentLanguage, "selectYear")}
                </option>
                {years.map(y => (
                  <option key={y.range} value={y.range}>
                    {y.range}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="engine"
                className="block text-sm font-bold text-black mb-1"
              >
                {translate(currentLanguage, "EngineValue")}
              </label>
              <select
                id="engine"
                name="engine"
                className={`w-full p-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${
                  !selected.year
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:border-gray-600"
                }`}
                value={selected.engine}
                onChange={handleEngineChange}
                disabled={!selected.year}
              >
                <option value="">
                  {translate(currentLanguage, "selectEngine")}
                </option>
                {Object.entries(groupedEngines).map(([fuelType, engines]) => (
                  <optgroup
                    label={
                      fuelType.toLowerCase() === "bensin"
                        ? translate(currentLanguage, "fuelPetrol")
                        : fuelType.toLowerCase() === "diesel"
                          ? translate(currentLanguage, "fuelDiesel")
                          : fuelType.charAt(0).toUpperCase() + fuelType.slice(1)
                    }
                    key={fuelType}
                  >
                    {engines.map(engine => (
                      <option key={engine.label} value={engine.label}>
                        {engine.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
        ) : (
          // New card view
          <div className="mb-8">
            {/* Brand selection */}
            {!selected.brand && (
              <>
                <h2 className="text-xl font-bold text-black mb-4">
                  Välj bilmärke
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {brands
                    .filter(b => !b.startsWith("[LASTBIL]"))
                    .sort((a, b) => a.localeCompare(b))
                    .map(brand => (
                      <div
                        key={brand}
                        onClick={() =>
                          setSelected({brand, model: "", year: "", engine: ""})
                        }
                        className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                      >
                        {data.find(b => b.name === brand)?.logo?.asset && (
                          <img
                            src={urlFor(data.find(b => b.name === brand)?.logo)
                              .width(100)
                              .url()}
                            alt={brand}
                            className="h-16 w-auto object-contain mb-2"
                          />
                        )}
                        <p className="text-center font-medium text-gray-800">
                          {brand}
                        </p>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* Model selection */}
            {selected.brand && !selected.model && (
              <>
                <button
                  onClick={() =>
                    setSelected({brand: "", model: "", year: "", engine: ""})
                  }
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
                  Tillbaka till bilmärken
                </button>
                <h2 className="text-xl font-bold text-black mb-4">
                  Välj {selected.brand} modell
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {models.map(model => (
                    <div
                      key={model.name}
                      onClick={() =>
                        setSelected(prev => ({
                          ...prev,
                          model: model.name,
                          year: "",
                          engine: "",
                        }))
                      }
                      className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                    >
                      <p className="text-center font-medium text-gray-800">
                        {model.name}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Year selection */}
            {selected.brand && selected.model && !selected.year && (
              <>
                <button
                  onClick={() =>
                    setSelected(prev => ({
                      ...prev,
                      model: "",
                      year: "",
                      engine: "",
                    }))
                  }
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
                  Tillbaka till modeller
                </button>
                <h2 className="text-xl font-bold text-black mb-4">
                  Välj årsmodell för {selected.brand} {selected.model}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {years.map(year => (
                    <div
                      key={year.range}
                      onClick={() =>
                        setSelected(prev => ({
                          ...prev,
                          year: year.range,
                          engine: "",
                        }))
                      }
                      className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                    >
                      <p className="text-center font-medium text-gray-800">
                        {year.range}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Engine selection */}
            {selected.brand &&
              selected.model &&
              selected.year &&
              !selected.engine && (
                <>
                  <button
                    onClick={() =>
                      setSelected(prev => ({...prev, year: "", engine: ""}))
                    }
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
                    Tillbaka till årsmodeller
                  </button>
                  <h2 className="text-xl font-bold text-black mb-4">
                    Välj motor för {selected.brand} {selected.model}{" "}
                    {selected.year}
                  </h2>

                  {/* Diesel engines */}
                  {engines.filter(e => e.fuel.toLowerCase().includes("diesel"))
                    .length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-3 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                        {translate(currentLanguage, "fuelDiesel")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {engines
                          .filter(e => e.fuel.toLowerCase().includes("diesel"))
                          .map(engine => (
                            <div
                              key={engine.label}
                              onClick={() =>
                                setSelected(prev => ({
                                  ...prev,
                                  engine: engine.label,
                                }))
                              }
                              className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                            >
                              <p className="text-center font-medium text-gray-800">
                                {engine.label}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Petrol engines */}
                  {engines.filter(e => e.fuel.toLowerCase().includes("bensin"))
                    .length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-3 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                        {translate(currentLanguage, "fuelPetrol")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {engines
                          .filter(e => e.fuel.toLowerCase().includes("bensin"))
                          .map(engine => (
                            <div
                              key={engine.label}
                              onClick={() =>
                                setSelected(prev => ({
                                  ...prev,
                                  engine: engine.label,
                                }))
                              }
                              className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                            >
                              <p className="text-center font-medium text-gray-800">
                                {engine.label}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Other engines */}
                  {engines.filter(
                    e =>
                      !e.fuel.toLowerCase().includes("diesel") &&
                      !e.fuel.toLowerCase().includes("bensin")
                  ).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-3 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                        {translate(currentLanguage, "otherEngines")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {engines
                          .filter(
                            e =>
                              !e.fuel.toLowerCase().includes("diesel") &&
                              !e.fuel.toLowerCase().includes("bensin")
                          )
                          .map(engine => (
                            <div
                              key={engine.label}
                              onClick={() =>
                                setSelected(prev => ({
                                  ...prev,
                                  engine: engine.label,
                                }))
                              }
                              className="cursor-pointer rounded-lg p-4 bg-white hover:bg-gray-50 border border-gray-200 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col items-center justify-center"
                            >
                              <p className="text-center font-medium text-gray-800">
                                {engine.label}
                              </p>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : stages.length > 0 ? (
          <div className="space-y-6">
            {stages.map(stage => {
              const isDsgStage = stage.name.toLowerCase().includes("dsg");
              const allOptions = getAllAktPlusOptions(stage);
              const isExpanded = expandedStages[stage.name] ?? false;

              return (
                <div
                  key={stage.name}
                  className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => toggleStage(stage.name)}
                    className="w-full p-6 text-left hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        {data.find(b => b.name === selected.brand)?.logo
                          ?.asset && (
                          <img
                            src={urlFor(
                              data.find(b => b.name === selected.brand)?.logo
                            )
                              .width(60)
                              .url()}
                            alt={selected.brand}
                            className="h-8 w-auto object-contain"
                          />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                          {selected.engine} -{" "}
                          <span
                            className={`uppercase tracking-wide ${getStageColor(stage.name)}`}
                          >
                            [{translateStageName(currentLanguage, stage.name)}]
                          </span>
                        </h2>
                      </div>

                      <div className="mt-3 md:mt-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-center">
                        <img
                          src={`/badges/${stage.name.toLowerCase().replace(/\s+/g, "")}.png`}
                          alt={stage.name}
                          className="h-8 object-contain"
                        />
                        <span className="inline-block bg-red-600 text-black px-4 py-1 rounded-full text-xl font-semibold shadow-md">
                          {stage.price?.toLocaleString()} kr
                        </span>
                        {(stage.name.includes("Steg 2") ||
                          stage.name.includes("Steg 3") ||
                          stage.name.includes("Steg 4")) && (
                          <p className="text-xs text-gray-400 mt-2 italic">
                            {translate(currentLanguage, "stageSoftwareOnly")}
                            <br />
                            {translate(
                              currentLanguage,
                              "stageContactForHardware"
                            )}
                          </p>
                        )}
                        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 hover:scale-110 transform transition-all duration-300">
                          <svg
                            className={`h-6 w-6 text-orange-500 transform transition-transform duration-300 ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      {isDsgStage ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-6">
                          {/* DSG/TCU-FÄLT */}
                          {stage.tcuFields?.launchControl && (
                            <div className="border border-blue-400 rounded-lg p-3 text-white">
                              <p className="text-sm font-bold text-blue-300 mb-1">
                                LAUNCH CONTROL
                              </p>
                              <p>
                                Original:{" "}
                                {stage.tcuFields.launchControl.original || "-"}{" "}
                                RPM
                              </p>
                              <p>
                                Optimerad:{" "}
                                <span className="text-green-400">
                                  {stage.tcuFields.launchControl.optimized ||
                                    "-"}{" "}
                                  RPM
                                </span>
                              </p>
                            </div>
                          )}
                          {stage.tcuFields?.rpmLimit && (
                            <div className="border border-blue-400 rounded-lg p-3 text-white">
                              <p className="text-sm font-bold text-blue-300 mb-1">
                                VARVSTOPP
                              </p>
                              <p>
                                Original:{" "}
                                {stage.tcuFields.rpmLimit.original || "-"} RPM
                              </p>
                              <p>
                                Optimerad:{" "}
                                <span className="text-green-400">
                                  {stage.tcuFields.rpmLimit.optimized || "-"}{" "}
                                  RPM
                                </span>
                              </p>
                            </div>
                          )}
                          {stage.tcuFields?.shiftTime && (
                            <div className="border border-blue-400 rounded-lg p-3 text-white">
                              <p className="text-sm font-bold text-blue-300 mb-1">
                                VÄXLINGSTID
                              </p>
                              <p>
                                Original:{" "}
                                {stage.tcuFields.shiftTime.original || "-"} ms
                              </p>
                              <p>
                                Optimerad:{" "}
                                <span className="text-green-400">
                                  {stage.tcuFields.shiftTime.optimized || "-"}{" "}
                                  ms
                                </span>
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
                          {/* ORIGINAL & TUNED SPECS - PERFORMANCE */}
                          <div className="border border-white rounded-lg p-3 text-center">
                            <p className="text-sm text-white font-bold mb-1">
                              {translate(currentLanguage, "originalHp")}
                            </p>
                            <p className="text-xl text-white font-bold">
                              {stage.origHk} hk
                            </p>
                          </div>
                          <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                            <p className="text-xl text-white font-bold mb-1 uppercase">
                              {translate(
                                currentLanguage,
                                "translateStageName",
                                stage.name
                              )}{" "}
                              HK
                            </p>
                            <p className="text-xl font-bold">
                              {stage.tunedHk} hk
                            </p>
                            <p className="text-xs mt-1 text-red-400">
                              +{stage.tunedHk - stage.origHk} hk
                            </p>
                          </div>
                          <div className="border border-white rounded-lg p-3 text-center">
                            <p className="text-sm text-white font-bold mb-1">
                              {translate(currentLanguage, "originalNm")}
                            </p>
                            <p className="text-xl text-white font-bold">
                              {stage.origNm} Nm
                            </p>
                          </div>
                          <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                            <p className="text-xl text-white font-bold mb-1 uppercase">
                              {translate(
                                currentLanguage,
                                "translateStageName",
                                stage.name
                              )}{" "}
                              NM
                            </p>
                            <p className="text-xl font-bold">
                              {stage.tunedNm} Nm
                            </p>
                            <p className="text-xs mt-1 text-red-400">
                              +{stage.tunedNm - stage.origNm} Nm
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button
                          onClick={() =>
                            setInfoModal({open: true, type: "stage", stage})
                          }
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                        >
                          📄{" "}
                          {translate(
                            currentLanguage,
                            "translateStageName",
                            stage.name
                          ).toUpperCase()}{" "}
                          {translate(currentLanguage, "infoStage")}
                        </button>
                        {/* Hidden SEO content for stage info */}
                        <div className="sr-only" aria-hidden="false">
                          <h2>{stage.name.toUpperCase()} INFORMATION</h2>
                          {stage.description?.[currentLanguage] && (
                            <PortableText
                              value={stage.description[currentLanguage]}
                              components={portableTextComponents}
                            />
                          )}
                        </div>

                        <button
                          onClick={() =>
                            setInfoModal({open: true, type: "general"})
                          }
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                        >
                          💡 {translate(currentLanguage, "infoGeneral")}
                        </button>
                      </div>
                      {/* Hidden SEO content for general info */}
                      <div className="sr-only" aria-hidden="false">
                        <h2>GENERELL INFORMATION</h2>
                        <div>
                          <ul className="space-y-2">
                            <li>✅ All mjukvara är skräddarsydd för din bil</li>
                            <li>✅ Felsökning inann samt efter optimering</li>
                            <li>
                              ✅ Loggning för att anpassa en individuell
                              mjukvara
                            </li>
                            <li>
                              ✅ Optimerad för både prestanda och bränsleekonomi
                            </li>
                          </ul>
                          <div className="mt-6 text-sm text-gray-400 leading-relaxed">
                            <p>
                              AK-TUNING är specialister på skräddarsydd
                              motoroptimering, chiptuning och ECU-programmering
                              för alla bilmärken.
                            </p>
                            <p className="mt-2">
                              Vi erbjuder effektökning, bättre bränsleekonomi
                              och optimerade köregenskaper. Tjänster i Göteborg,
                              Stockholm, Malmö, Jönköping, Örebro och Storvik.
                            </p>
                            <p className="mt-2">
                              All mjukvara utvecklas in-house med fokus på
                              kvalitet, säkerhet och lång livslängd. Välkommen
                              till en ny nivå av bilprestanda med AK-TUNING.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        {!isDsgStage && (
                          <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                            {translate(
                              currentLanguage,
                              "translateStageName",
                              stage.name
                            ).toUpperCase()}{" "}
                          </h3>
                        )}

                        {/* Mobile-only legend above chart */}
                        {!isDsgStage && (
                          <div className="flex justify-center items-center gap-2 md:hidden text-xs text-white">
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full border-2 border-red-400"></span>
                              <span>ORG HK</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-red-400"></span>
                              <span>
                                {" "}
                                {stage.name
                                  .replace("Steg", "ST")
                                  .replace(/\s+/g, "")
                                  .toUpperCase()}{" "}
                                HK
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full border-2 border-white"></span>
                              <span>ORG NM</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="w-3 h-3 rounded-full bg-white"></span>
                              <span>
                                {" "}
                                {stage.name
                                  .replace("Steg", "ST")
                                  .replace(/\s+/g, "")
                                  .toUpperCase()}{" "}
                                NM
                              </span>
                            </div>
                          </div>
                        )}

                        {!isDsgStage && (
                          <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                            {/* Split the spec boxes */}
                            <div className="absolute hidden md:flex flex-row justify-between top-4 left-0 right-0 px-16">
                              {/* ORG HK / Max HK */}
                              <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                                <p className="text-red-600">- - -</p>
                                <p className="text-white">
                                  HK ORG: {stage.origHk} HK
                                </p>
                                <p className="text-red-600">_____</p>
                                <p className="text-white">
                                  HK{" "}
                                  {stage.name
                                    .replace("Steg", "ST")
                                    .replace(/\s+/g, "")
                                    .toUpperCase()}
                                  : {stage.tunedHk} HK
                                </p>
                              </div>

                              {/* ORG NM / Max NM */}
                              <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                                <p className="text-white">- - -</p>
                                <p className="text-white">
                                  NM ORG: {stage.origNm} NM
                                </p>
                                <p className="text-white">_____</p>
                                <p className="text-white">
                                  NM{" "}
                                  {stage.name
                                    .replace("Steg", "ST")
                                    .replace(/\s+/g, "")
                                    .toUpperCase()}
                                  : {stage.tunedNm} NM
                                </p>
                              </div>
                            </div>
                            {/* Dyno graph */}
                            <Line
                              data={{
                                labels: rpmLabels,
                                datasets: [
                                  {
                                    label: "ORG HK",
                                    data: generateDynoCurve(
                                      stage.origHk,
                                      true,
                                      selectedEngine.fuel
                                    ),
                                    borderColor: "#f87171",
                                    backgroundColor: "transparent",
                                    borderWidth: 2,
                                    borderDash: [5, 3],
                                    tension: 0.5,
                                    pointRadius: 0,
                                    yAxisID: "hp",
                                  },
                                  {
                                    label: `ST ${stage.name.replace(/\D/g, "")} HK`,
                                    data: generateDynoCurve(
                                      stage.tunedHk,
                                      true,
                                      selectedEngine.fuel
                                    ),
                                    borderColor: "#f87171",
                                    backgroundColor: "#f87171",
                                    borderWidth: 3,
                                    tension: 0.5,
                                    pointRadius: 0,
                                    yAxisID: "hp",
                                  },
                                  {
                                    label: "ORG NM",
                                    data: generateDynoCurve(
                                      stage.origNm,
                                      false,
                                      selectedEngine.fuel
                                    ),
                                    borderColor: "#d1d5db",
                                    backgroundColor: "transparent",
                                    borderWidth: 2,
                                    borderDash: [5, 3],
                                    tension: 0.5,
                                    pointRadius: 0,
                                    yAxisID: "nm",
                                  },
                                  {
                                    label: `ST ${stage.name.replace(/\D/g, "")} NM`,
                                    data: generateDynoCurve(
                                      stage.tunedNm,
                                      false,
                                      selectedEngine.fuel
                                    ),
                                    borderColor: "#d1d5db",
                                    backgroundColor: "transparent",
                                    borderWidth: 3,
                                    tension: 0.5,
                                    pointRadius: 0,
                                    yAxisID: "nm",
                                  },
                                ],
                              }}
                              options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                  legend: {
                                    display: false,
                                  },
                                  tooltip: {
                                    enabled: true,
                                    mode: "index",
                                    intersect: false,
                                    backgroundColor: "#1f2937",
                                    titleColor: "#ffffff",
                                    bodyColor: "#ffffff",
                                    borderColor: "#6b7280",
                                    borderWidth: 1,
                                    padding: 10,
                                    displayColors: true,
                                    usePointStyle: true, // ✅ this enables circle style
                                    callbacks: {
                                      labelPointStyle: () => ({
                                        pointStyle: "circle", // ✅ make symbol a circle
                                        rotation: 0,
                                      }),
                                      title: function (tooltipItems) {
                                        // tooltipItems[0].label will be the RPM (e.g., "4000")
                                        return `${tooltipItems[0].label} RPM`;
                                      },
                                      label: function (context) {
                                        const label =
                                          context.dataset.label || "";
                                        const value = context.parsed.y;

                                        // Guard for undefined value
                                        if (value === undefined) return label;

                                        const unit =
                                          context.dataset.yAxisID === "hp"
                                            ? "hk"
                                            : "Nm";
                                        return `${label}: ${Math.round(value)} ${unit}`;
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  hp: {
                                    type: "linear",
                                    display: true,
                                    position: "left",
                                    title: {
                                      display: true,
                                      text: "EFFEKT",
                                      color: "white",
                                      font: {size: 14},
                                    },
                                    min: 0,
                                    max:
                                      Math.ceil(stage.tunedHk / 100) * 100 +
                                      100,
                                    grid: {
                                      color: "rgba(255, 255, 255, 0.1)",
                                    },
                                    ticks: {
                                      color: "#9CA3AF",
                                      stepSize: 100,
                                      callback: value => `${value}`,
                                    },
                                  },
                                  nm: {
                                    type: "linear",
                                    display: true,
                                    position: "right",
                                    title: {
                                      display: true,
                                      text: "VRIDMOMENT",
                                      color: "white",
                                      font: {size: 14},
                                    },
                                    min: 0,
                                    max:
                                      Math.ceil(stage.tunedNm / 100) * 100 +
                                      100,
                                    grid: {
                                      drawOnChartArea: false,
                                    },
                                    ticks: {
                                      color: "#9CA3AF",
                                      stepSize: 100,
                                      callback: value => `${value}`,
                                    },
                                  },
                                  x: {
                                    title: {
                                      display: true,
                                      text: "RPM",
                                      color: "#E5E7EB",
                                      font: {size: 14},
                                    },
                                    grid: {
                                      color: "rgba(255, 255, 255, 0.1)",
                                    },
                                    ticks: {
                                      color: "#9CA3AF",
                                    },
                                  },
                                },
                                interaction: {
                                  intersect: false,
                                  mode: "index",
                                },
                              }}
                              plugins={[watermarkPlugin, shadowPlugin]}
                            />

                            <div className="text-center text-white text-xs mt-4 italic">
                              {translate(currentLanguage, "tuningCurveNote")}
                            </div>
                          </div>
                        )}

                        {/* small tuned specs */}
                        {!isDsgStage && (
                          <div className="mt-8 mb-10">
                            {/* Performance Summary */}
                            <div className="text-center mb-6">
                              <p className="text-lg font-semibold text-white">
                                {translate(currentLanguage, "tuningIntro")}{" "}
                                <span className={getStageColor(stage.name)}>
                                  {stage.name
                                    .replace(
                                      "Steg",
                                      translate(currentLanguage, "stageLabel")
                                    )
                                    .toUpperCase()}
                                </span>
                              </p>
                              <p className="text-gray-300 mt-1">
                                {`${stage.tunedHk} HK & ${stage.tunedNm} NM`}
                              </p>
                            </div>

                            {/* Contact Button and Social Media - Restructured */}
                            <div className="flex flex-col gap-4 max-w-2xl mx-auto mt-8 mb-10">
                              {/* Contact Button (Green) */}
                              <button
                                onClick={() => handleBookNow(stage.name)}
                                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-4 py-3 rounded-lg font-medium shadow-lg flex items-center justify-center gap-2 transition-all"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                  />
                                </svg>
                                {translate(currentLanguage, "contactvalue")}
                              </button>

                              {/* Social Media Links */}
                              <div className="flex items-center justify-center space-x-2">
                                <a
                                  href="https://www.facebook.com/aktuned"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-blue-600 hover:bg-blue-700 p-3 rounded-lg flex items-center justify-center transition-colors"
                                  aria-label="Facebook"
                                >
                                  <svg
                                    className="w-5 h-5 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                                  </svg>
                                </a>
                                <a
                                  href="https://www.instagram.com/aktuning.se"
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 p-3 rounded-lg flex items-center justify-center transition-colors"
                                  aria-label="Instagram"
                                >
                                  <svg
                                    className="w-5 h-5 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                                  </svg>
                                </a>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {!isDsgStage && allOptions.length > 0 && (
                        <div className="mt-8">
                          {/* AKT+ Toggle Button */}
                          <button
                            onClick={() => toggleAktPlus(stage.name)}
                            className="flex justify-between items-center w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <img
                                src="/logos/aktplus.png"
                                alt="AKT+ Logo"
                                className="h-8 w-auto object-contain"
                              />
                              <h3 className="text-md font-semibold text-white">
                                {translate(currentLanguage, "additionsLabel")}
                              </h3>
                            </div>
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800">
                              <svg
                                className={`h-5 w-5 text-orange-500 transform transition-transform duration-300 ${
                                  expandedAktPlus[stage.name]
                                    ? "rotate-180"
                                    : ""
                                }`}
                                viewBox="0 0 20 20"
                                fill="currentColor"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                          </button>

                          {/* Expandable AKT+ Grid */}
                          {expandedAktPlus[stage.name] && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {allOptions.map(option => {
                                const translatedTitle =
                                  option.title?.[currentLanguage] ||
                                  option.title?.sv ||
                                  "";
                                const translatedDescription =
                                  option.description?.[currentLanguage] ||
                                  option.description?.sv;

                                return (
                                  <div
                                    key={option._id}
                                    className="border border-gray-600 rounded-lg overflow-hidden bg-gray-700 transition-all duration-300"
                                  >
                                    <button
                                      onClick={() => toggleOption(option._id)}
                                      className="w-full flex justify-between items-center p-4 hover:bg-gray-600 transition-colors"
                                    >
                                      <div className="flex items-center gap-3">
                                        {option.gallery?.[0]?.asset && (
                                          <img
                                            src={urlFor(option.gallery[0].asset)
                                              .width(80)
                                              .url()}
                                            alt={
                                              option.gallery[0].alt ||
                                              translatedTitle ||
                                              "AKT+"
                                            }
                                            className="h-10 w-10 object-contain"
                                          />
                                        )}
                                        <span className="text-lg font-bold text-orange-600">
                                          {translatedTitle}
                                        </span>
                                      </div>

                                      <svg
                                        className={`h-5 w-5 text-orange-600 transition-transform ${
                                          expandedOptions[option._id]
                                            ? "rotate-180"
                                            : ""
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
                                      <div className="bg-gray-800 border-t border-gray-600 p-4 space-y-4">
                                        {translatedDescription && (
                                          <div className="prose prose-invert max-w-none text-sm">
                                            <PortableText
                                              value={translatedDescription}
                                              components={
                                                portableTextComponents
                                              }
                                            />
                                          </div>
                                        )}

                                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                          {option.price && (
                                            <p className="font-bold text-green-400">
                                              {translate(
                                                currentLanguage,
                                                "priceLabel"
                                              )}
                                              : {option.price.toLocaleString()}{" "}
                                              kr
                                            </p>
                                          )}

                                          <button
                                            onClick={() =>
                                              handleBookNow(translatedTitle)
                                            }
                                            className="bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                                          >
                                            📩{" "}
                                            {translate(
                                              currentLanguage,
                                              "contactvalue"
                                            )}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Modal */}
        <ContactModal
          isOpen={contactModalData.isOpen}
          onClose={() =>
            setContactModalData({isOpen: false, stageOrOption: "", link: ""})
          }
          selectedVehicle={{
            brand: selected.brand,
            model: selected.model,
            year: selected.year,
            engine: selected.engine,
          }}
          stageOrOption={contactModalData.stageOrOption}
          link={contactModalData.link}
          scrollPosition={contactModalData.scrollPosition}
        />
        <InfoModal
          isOpen={infoModal.open}
          onClose={() => setInfoModal({open: false, type: infoModal.type})}
          title={
            infoModal.type === "stage"
              ? translate(currentLanguage, "stageInfoPrefix").replace(
                  "{number}",
                  infoModal.stage?.name.replace(/\D/g, "") || ""
                )
              : translate(currentLanguage, "generalInfoLabel")
          }
          id={
            infoModal.type === "stage"
              ? `${slugify(infoModal.stage?.name || "")}-modal`
              : "general-info-modal"
          }
          content={
            infoModal.type === "stage" ? (
              (() => {
                const description =
                  infoModal.stage?.descriptionRef?.description ||
                  infoModal.stage?.description;

                if (!description) return null;

                // Om det är en array ⇒ gammalt format
                if (Array.isArray(description)) {
                  return (
                    <PortableText
                      value={description}
                      components={portableTextComponents}
                    />
                  );
                }

                // Om det är ett objekt ⇒ försök hämta språkbaserat innehåll
                if (typeof description === "object") {
                  const langDesc =
                    description[currentLanguage] || description["sv"] || [];

                  return (
                    <PortableText
                      value={langDesc}
                      components={portableTextComponents}
                    />
                  );
                }

                // fallback ifall det är ren text eller okänt
                return <p>{String(description)}</p>;
              })()
            ) : (
              <div id="general-info-content">
                <ul className="space-y-2">
                  <li>✅ {translate(currentLanguage, "customSoftware")}</li>
                  <li>✅ {translate(currentLanguage, "prePostDiagnostics")}</li>
                  <li>
                    ✅ {translate(currentLanguage, "loggingForCustomization")}
                  </li>
                  <li>
                    ✅ {translate(currentLanguage, "performanceAndEconomy")}
                  </li>
                </ul>

                <div className="mt-6 text-sm text-gray-400 leading-relaxed">
                  <p>
                    <p>{translate(currentLanguage, "aboutUs1")}</p>
                  </p>
                  <p className="mt-2">
                    {translate(currentLanguage, "aboutUs2")}
                  </p>
                  <p className="mt-2">
                    {translate(currentLanguage, "aboutUs3")}
                  </p>
                </div>
              </div>
            )
          }
        />
      </div>
    </>
  );
}

const InfoModal = ({
  isOpen,
  onClose,
  title,
  content,
  id,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  id: string;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Handle escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // Focus the modal when opened
      modalRef.current?.focus();
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        id={id}
        className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-2xl w-full outline-none"
        tabIndex={-1}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id={`${id}-title`} className="text-white text-lg font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="text-white text-xl hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            &times;
          </button>
        </div>
        <div
          id={`${id}-content`}
          className="text-gray-300 text-sm max-h-[70vh] overflow-y-auto"
        >
          {content}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            ❌ STÄNG
          </button>
        </div>
      </div>
    </div>
  );
};

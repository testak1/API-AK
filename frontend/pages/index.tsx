// pages/index.tsx
import Head from "next/head";
import Image from "next/image";
import React, {
  useEffect,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "react";
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
import { PortableText } from "@portabletext/react";
import RegnrSearch from "@/components/RegnrSearch";
import ContactModal from "@/components/ContactModal";
import { urlFor } from "@/lib/sanity";
import PublicLanguageDropdown from "@/components/PublicLanguageSwitcher";
import { LayoutGrid, List } from "lucide-react";
import { t as translate } from "@/lib/translations";
import type {
  Brand,
  Stage,
  AktPlusOption,
  AktPlusOptionReference,
} from "@/types/sanity";
import dynamic from "next/dynamic";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
);

// LAZY-LOADED COMPONENTS
const FuelSavingCalculator = dynamic(
  () => import("@/components/FuelSavingCalculator"),
  { ssr: false },
);

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-400">Laddar dynobild...</p>
    </div>
  ),
});

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

interface FlatVehicle {
  engineLabel: string;
  engineFuel: string;
  engineHp: number;
  yearRange: string;
  modelName: string;
  brandName: string;
  brandSlug?: string;
  modelSlug?: string;
  yearSlug?: string;
  engineSlug?: string;
}

const isYearInRange = (
  year: string,
  range: string | undefined | null,
): boolean => {
  if (!range) return false;

  const yearNum = parseInt(year, 10);
  if (isNaN(yearNum)) return false;

  const rangeMatch =
    range.match(/(\d{4})\D*(\d{4})/) || range.match(/(\d{4})\D*[-–]/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1], 10);
    const endYear = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : Infinity;
    return yearNum >= startYear && yearNum <= endYear;
  }

  const singleYear = range.match(/(?:^|\D)(\d{4})(?:\D|$)/);
  if (singleYear) {
    return yearNum === parseInt(singleYear[1], 10);
  }

  return false;
};

const normalize = (str: string | undefined | null): string => {
  if (!str) return "";
  return str.toLowerCase().replace(/[^a-z0-9]/g, "");
};

export default function TuningViewer() {
  const [data, setData] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<SelectionState>({
    brand: "",
    model: "",
    year: "",
    engine: "",
  });
  const [allVehicles, setAllVehicles] = useState<FlatVehicle[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"card" | "dropdown">("card");
  const [isLoading, setIsLoading] = useState(true);
  // const [isDbLoading, setIsDbLoading] = useState(true); // BORTTAGEN - ersatt av isVehicleDbLoading
  const [isVehicleDbLoading, setIsVehicleDbLoading] = useState(false);
  const vehicleDataPromiseRef = useRef<Promise<void> | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedOptions, setExpandedOptions] = useState<
    Record<string, boolean>
  >({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);
  const [currentLanguage, setCurrentLanguage] = useState("sv");
  const [allModels, setAllModels] = useState<any[]>([]);
  const [contactModalData, setContactModalData] = useState<{
    isOpen: boolean;
    stageOrOption: string;
    link: string;
    scrollPosition?: number;
  }>({ isOpen: false, stageOrOption: "", link: "" });
  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }>({ open: false, type: "stage" });
  const [allAktPlusOptions, setAllAktPlusOptions] = useState<AktPlusOption[]>(
    [],
  );
  const [expandedAktPlus, setExpandedAktPlus] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    setIsLoading(true);

    fetch("/api/brands")
      .then((res) => res.json())
      .then((brandsData) => {
        setData(brandsData.result || []);
      })
      .catch((error) => {
        console.error("Fel vid hämtning av märkesdata:", error);
        setSearchError("Kunde inte ladda fordonsmärken.");
      })
      .finally(() => {
        setIsLoading(false);
      });

    fetch("/data/all_models.json")
      .then((res) => res.json())
      .then((data) => setAllModels(data))
      .catch((err) => console.error("Fel vid inläsning av modellbilder:", err));

    const savedView = localStorage.getItem("viewMode");
    if (savedView === "dropdown") {
      setViewMode("dropdown");
    }

    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
      setCurrentLanguage(storedLang);
    }

    const img = new window.Image();
    img.src = "/ak-logo.png";
    img.onload = () => {
      watermarkImageRef.current = img;
    };
  }, []);

  const loadVehicleData = useCallback(() => {
    if (vehicleDataPromiseRef.current) {
      return;
    }

    console.log("Användarinteraktion: Startar inläsning av fordonsdatabas...");
    setIsVehicleDbLoading(true);

    const promise = fetch("/api/all-vehicles")
      .then((res) => res.json())
      .then((vehiclesData) => {
        setAllVehicles(vehiclesData.vehicles || []);
        console.log(
          `Hämtat ${vehiclesData.vehicles?.length || 0} fordon för matchning.`,
        );
      })
      .catch((error) => {
        console.error("Fel vid hämtning av fordonsdata:", error);
        setSearchError("Kunde inte ladda sökdatabasen. Välj bil manuellt.");
      })
      .finally(() => {
        setIsVehicleDbLoading(false);
      });

    vehicleDataPromiseRef.current = promise;
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", currentLanguage);
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

  useEffect(() => {
    const fetchYears = async () => {
      if (selected.brand && selected.model) {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/years?brand=${encodeURIComponent(
              selected.brand,
            )}&model=${encodeURIComponent(selected.model)}`,
          );
          if (!res.ok) throw new Error("Failed to fetch years");
          const years = await res.json();
          setData((prev) =>
            prev.map((brand) =>
              brand.name !== selected.brand
                ? brand
                : {
                    ...brand,
                    models: brand.models.map((model) =>
                      model.name !== selected.model
                        ? model
                        : { ...model, years: years.result },
                    ),
                  },
            ),
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

  useEffect(() => {
    const fetchEngines = async () => {
      if (selected.brand && selected.model && selected.year) {
        setIsLoading(true);
        try {
          const res = await fetch(
            `/api/engines?brand=${encodeURIComponent(
              selected.brand,
            )}&model=${encodeURIComponent(
              selected.model,
            )}&year=${encodeURIComponent(
              selected.year,
            )}&lang=${currentLanguage}`,
          );
          if (!res.ok) throw new Error("Failed to fetch engines");
          const engines = await res.json();
          setData((prev) =>
            prev.map((brand) =>
              brand.name !== selected.brand
                ? brand
                : {
                    ...brand,
                    models: brand.models.map((model) =>
                      model.name !== selected.model
                        ? model
                        : {
                            ...model,
                            years: model.years.map((year) =>
                              year.range !== selected.year
                                ? year
                                : { ...year, engines: engines.result },
                            ),
                          },
                    ),
                  },
            ),
          );
        } catch (error) {
          console.error("Error fetching engines:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };
    fetchEngines();
  }, [selected.brand, selected.model, selected.year, currentLanguage]);

  const {
    brands,
    models,
    years,
    engines,
    selectedEngine,
    stages,
    groupedEngines,
  } = useMemo(() => {
    const brands = data.map((b) => b.name);

    const modelsData =
      data.find((b) => b.name === selected.brand)?.models || [];

    const selectedModel = modelsData.find((m) => m.name === selected.model);
    const yearsData = Array.isArray(selectedModel?.years)
      ? selectedModel.years
      : [];

    const selectedYear = yearsData.find((y) => y.range === selected.year);
    const enginesData = Array.isArray(selectedYear?.engines)
      ? selectedYear.engines
      : [];

    const currentEngine = enginesData.find((e) => e.label === selected.engine);
    const currentStages = currentEngine?.stages || [];

    const grouped = Array.isArray(enginesData)
      ? enginesData.reduce(
          (acc, engine) => {
            const fuelType = engine.fuel;
            if (!acc[fuelType]) acc[fuelType] = [];
            acc[fuelType].push(engine);
            return acc;
          },
          {} as Record<string, typeof enginesData>,
        )
      : {};

    return {
      brands,
      models: modelsData,
      years: yearsData,
      engines: enginesData,
      selectedEngine: currentEngine,
      stages: currentStages,
      groupedEngines: grouped,
    };
  }, [data, selected]);

  useEffect(() => {
    if (stages.length > 0) {
      const initialExpandedStates = stages.reduce(
        (acc, stage) => {
          acc[stage.name] = stage.name === "Steg 1";
          return acc;
        },
        {} as Record<string, boolean>,
      );
      setExpandedStages(initialExpandedStates);
    } else {
      setExpandedStages({});
    }
  }, [stages]);

  const handleVehicleFound = (scrapedVehicle: {
    brand: string;
    model: string;
    year: string;
    fuel: string;
    powerHp: string;
    engineCm3: string;
  }) => {
    console.log("--- STARTAR NY SÖKNING ---");
    console.log("Mottagen skrapad data:", scrapedVehicle);
    setSearchError(null);

    if (allVehicles.length === 0) {
      setSearchError(
        "Fordonsdatabasen är inte laddad än. Försök igen om ett ögonblick.",
      );
      return;
    }

    const normalizeBrand = (brand: string) => {
      return brand
        .toLowerCase()
        .replace(/-/g, " ")
        .replace(/[^a-z0-9]/g, "")
        .replace("mercedesbenz", "mercedes");
    };

    const normalizeBMWModel = (model: string) => {
      return model
        .replace(/\s?x\s?drive\s?/gi, "")
        .replace(/^m(\d)/i, "$1")
        .replace(/\s?e?hybrid\s?/gi, "")
        .replace(/\s+/g, " ")
        .trim()
        .toUpperCase();
    };

    const normalizeModel = (model: string, brand: string) => {
      const normalizedBrand = normalizeBrand(brand);
      let normalized = model
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

      if (normalizedBrand === "bmw") {
        normalized = normalizeBMWModel(model).toLowerCase();

        const bmwMatch = normalized.match(/^(\d+)([a-z]+)$/);
        if (bmwMatch) {
          const series = bmwMatch[1].charAt(0);
          normalized = `${series} ${bmwMatch[1]}${bmwMatch[2]}`;
        }
      }

      return normalized.replace(/\s+/g, "");
    };

    const scrapedBrandNorm = normalizeBrand(scrapedVehicle.brand);
    const scrapedModelNorm = normalizeModel(
      scrapedVehicle.model,
      scrapedVehicle.brand,
    );
    const scrapedHp = parseInt(scrapedVehicle.powerHp, 10);
    const scrapedFuelNorm = normalize(scrapedVehicle.fuel);
    const scrapedVolumeLiters =
      Math.round((parseInt(scrapedVehicle.engineCm3, 10) / 1000) * 10) / 10;

    let bestMatch: { vehicle: FlatVehicle; score: number } | null = null;
    let closestModel: FlatVehicle | null = null;
    let closestYearModel: FlatVehicle | null = null;

    for (const vehicle of allVehicles) {
      const vehicleBrandNorm = normalizeBrand(vehicle.brandName);

      if (vehicleBrandNorm !== scrapedBrandNorm) {
        if (
          !(
            vehicleBrandNorm === "mercedes" &&
            scrapedBrandNorm === "mercedesbenz"
          )
        ) {
          continue;
        }
      }

      const vehicleModelNorm = normalizeModel(
        vehicle.modelName,
        vehicle.brandName,
      );
      let modelMatch = false;

      if (vehicleBrandNorm === "bmw") {
        const normalizedScrapedModel = normalizeBMWModel(scrapedVehicle.model);
        const normalizedDBModel = normalizeBMWModel(vehicle.modelName);

        const scrapedEngineCode =
          normalizedScrapedModel.match(/\d{3}[DIGLIMNPT]/)?.[0];
        const dbEngineCode =
          vehicle.engineLabel.match(/\d{3}[DIGLIMNPT]/i)?.[0];

        const seriesMatch =
          normalizedScrapedModel.charAt(0) === normalizedDBModel.charAt(0) ||
          vehicle.modelName.includes(
            normalizedScrapedModel.charAt(0) + "-Serie",
          );

        const engineMatch =
          scrapedEngineCode &&
          dbEngineCode &&
          scrapedEngineCode.toLowerCase() === dbEngineCode.toLowerCase();

        modelMatch = seriesMatch && engineMatch;

        console.log("BMW Matchning:", {
          scraped: {
            original: scrapedVehicle.model,
            normalized: normalizedScrapedModel,
            engineCode: scrapedEngineCode,
          },
          database: {
            original: vehicle.modelName,
            normalized: normalizedDBModel,
            engineCode: dbEngineCode,
            engineLabel: vehicle.engineLabel,
          },
          matches: { seriesMatch, engineMatch },
        });
      } else {
        modelMatch =
          vehicleModelNorm === scrapedModelNorm ||
          scrapedModelNorm.includes(vehicleModelNorm) ||
          vehicleModelNorm.includes(scrapedModelNorm);
      }

      if (!modelMatch) continue;

      if (!closestModel) {
        closestModel = vehicle;
      }

      if (normalize(vehicle.engineFuel) !== scrapedFuelNorm) continue;

      const yearInRange = isYearInRange(scrapedVehicle.year, vehicle.yearRange);

      if (!closestYearModel && yearInRange) {
        closestYearModel = vehicle;
      }

      if (!yearInRange) continue;

      let volume = 0;
      if (vehicleBrandNorm === "bmw") {
        const bmwMatch = vehicle.engineLabel.match(/(\d)(\d)\s?[di]/i);
        if (bmwMatch) {
          volume = parseFloat(`${bmwMatch[1]}.${bmwMatch[2]}`);
        }
      } else {
        const volumeMatch =
          vehicle.engineLabel.match(/(\d[,.]\d)\s?L?/i) ||
          vehicle.engineLabel.match(/(\d)\s?L/i);
        if (volumeMatch) {
          volume = parseFloat(volumeMatch[1].replace(",", "."));
        }
      }

      if (!volume) continue;
      const volumeDiff = Math.abs(volume - scrapedVolumeLiters);
      if (volumeDiff > 0.3) continue;

      let hp = 0;
      const hpMatch =
        vehicle.engineLabel.match(/(\d+)\s*(hk|hp|ps|kw)/i) ||
        (vehicleBrandNorm === "bmw" && vehicle.engineLabel.match(/(\d+)[di]/i));

      if (hpMatch) {
        hp = parseInt(hpMatch[1], 10);
        if (hpMatch[2]?.toLowerCase() === "kw") {
          hp = Math.round(hp * 1.36);
        }
      } else {
        continue;
      }

      const hpDiff = Math.abs(hp - scrapedHp);
      if (hpDiff > 15) continue;

      const score = volumeDiff * 100 + hpDiff;

      if (!bestMatch || score < bestMatch.score) {
        bestMatch = { vehicle, score };
      }
    }

    if (bestMatch) {
      console.log(
        "Bästa match hittad:",
        bestMatch.vehicle,
        "Poäng:",
        bestMatch.score,
      );
      setSelected({
        brand: bestMatch.vehicle.brandName,
        model: bestMatch.vehicle.modelName,
        year: bestMatch.vehicle.yearRange,
        engine: bestMatch.vehicle.engineLabel,
      });
      setSearchError(null);
    } else if (closestYearModel) {
      console.log("Modell med rätt år hittad:", closestYearModel);
      setSelected({
        brand: closestYearModel.brandName,
        model: closestYearModel.modelName,
        year: closestYearModel.yearRange,
        engine: "",
      });
      setSearchError("Välj motor manuellt från listan");
    } else if (closestModel) {
      console.log("Närmaste modell hittad:", closestModel);
      setSelected({
        brand: closestModel.brandName,
        model: closestModel.modelName,
        year: "",
        engine: "",
      });
      setSearchError("Välj år och motor manuellt från listan");
    } else {
      setSearchError(
        `Ingen match hittades för ${scrapedVehicle.brand} ${scrapedVehicle.model}.\n` +
          `Kontrollera registreringsnumret eller välj manuellt.`,
      );
    }
  };

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

  const getStageColor = (stageName: string) => {
    const name = stageName.toLowerCase();
    if (name.includes("steg 1")) return "text-red-500";
    if (name.includes("steg 2")) return "text-orange-400";
    if (name.includes("steg 3")) return "text-purple-400";
    if (name.includes("steg 4")) return "text-yellow-400";
    if (name.includes("dsg")) return "text-blue-400";
    return "text-white";
  };

  const cleanText = (str: string | null | undefined) => {
    if (!str) return "";
    return str
      .replace(/\.\.\./g, "")
      .replace(/\//g, "-")
      .replace(/\s+/g, " ")
      .trim();
  };

  const dynamicTitle = selected.brand
    ? cleanText(
        `Motoroptimering ${selected.brand} ${selected.model || ""} ${
          selected.year || ""
        } ${selected.engine || ""} | AK-TUNING`,
      )
    : cleanText(
        "Motoroptimering – AK-TUNING | Göteborg • Jönköping • Skåne • Stockholm • Örebro",
      );

  const formatModelName = (brand: string, model: string): string => {
    const mercedesModels = [
      "A",
      "B",
      "C",
      "CL",
      "CLA",
      "CLC",
      "CLK",
      "CLS",
      "E",
      "G",
      "GL",
      "GLA",
      "GLB",
      "GLC",
      "GLE",
      "GLK",
      "GLS",
      "GT",
      "ML",
      "R",
      "S",
      "SL",
      "SLC",
      "SLK",
      "SLS",
      "V",
      "X",
    ];
    if (
      brand.toLowerCase().includes("mercedes") &&
      mercedesModels.includes(model.toUpperCase())
    ) {
      return `${model}-klass`;
    }
    return model;
  };

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

  const getModelImage = (modelName: string, brandName: string): string => {
    const normalize = (str: string) => str.toLowerCase().replace(/\s+/g, "");

    if (
      normalize(modelName).includes("lastbil") ||
      brandName.includes("[LASTBIL]")
    ) {
      return "https://tuning.aktuning.se/logos/missing-lastbil.png";
    }

    const exactMatch = allModels.find(
      (m) =>
        normalize(m.name) === normalize(modelName) &&
        m.brand.toLowerCase() === brandName.toLowerCase(),
    );
    if (exactMatch?.image_url) return exactMatch.image_url;
    const fuzzyMatch = allModels.find(
      (m) =>
        normalize(m.name).includes(normalize(modelName)) &&
        m.brand.toLowerCase() === brandName.toLowerCase(),
    );
    return (
      fuzzyMatch?.image_url || "https://tuning.aktuning.se/logos/missing.png"
    );
  };

  const toggleViewMode = () => {
    const newMode = viewMode === "dropdown" ? "card" : "dropdown";
    setViewMode(newMode);
    localStorage.setItem("viewMode", newMode);
  };

  const slugifyStage = (str: string) =>
    str
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "");

  const handleBookNow = (
    stageOrOptionName: string,
    event?: React.MouseEvent,
  ) => {
    const selectedBrand = data.find((b) => b.name === selected.brand);
    if (!selectedBrand) return;
    const brandSlug =
      selectedBrand.slug?.current || slugify(selectedBrand.name);
    const selectedModel = selectedBrand.models?.find(
      (m) => m.name === selected.model,
    );
    if (!selectedModel) return;
    const modelSlug =
      typeof selectedModel.slug === "object"
        ? selectedModel.slug.current
        : selectedModel.slug || slugify(selectedModel.name);
    const selectedYear = selectedModel.years?.find(
      (y) => y.range === selected.year,
    );
    if (!selectedYear) return;
    const yearSlug = selectedYear.range.includes(" ")
      ? slugify(selectedYear.range)
      : selectedYear.range;
    const selectedEngine = selectedYear.engines?.find(
      (e) => e.label === selected.engine,
    );
    if (!selectedEngine) return;
    const engineSlug = selectedEngine.label.includes(" ")
      ? slugify(selectedEngine.label)
      : selectedEngine.label;
    const stageSlug = slugifyStage(stageOrOptionName);
    const finalLink = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}/${stageSlug}`;
    const clickY = event?.clientY || 0;
    const scrollY = window.scrollY + clickY;
    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    setContactModalData({
      isOpen: true,
      stageOrOption: stageOrOptionName,
      link: finalLink,
      scrollPosition: isMobile ? undefined : 0,
    });
    window.parent.postMessage({ scrollToIframe: true }, "*");
  };

  const watermarkPlugin = {
    id: "watermark",
    beforeDraw: (chart: ChartJS) => {
      const ctx = chart.ctx;
      const {
        chartArea: { top, left, width, height },
      } = chart;

      if (watermarkImageRef.current?.complete) {
        ctx.save();
        ctx.globalAlpha = 0.2;

        const img = watermarkImageRef.current;
        const ratio = img.width / img.height;

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
      const { ctx } = chart;
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
        .forEach((opt) => {
          if (
            (opt.isUniversal ||
              opt.applicableFuelTypes?.includes(selectedEngine.fuel) ||
              opt.manualAssignments?.some(
                (ref) => ref._ref === selectedEngine._id,
              )) &&
            (!opt.stageCompatibility || opt.stageCompatibility === stage.name)
          ) {
            uniqueOptionsMap.set(opt._id, opt);
          }
        });
      return Array.from(uniqueOptionsMap.values());
    },
    [selectedEngine],
  );

  const generateDynoCurve = (
    peakValue: number,
    isHp: boolean,
    fuelType: string,
  ) => {
    const isDiesel = fuelType.toLowerCase().includes("diesel");

    // RPM-ranges baserat på bränsletyp
    const rpmRange = isDiesel
      ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
      : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

    const totalSteps = rpmRange.length;

    // Lägg till lite slumpmässig variation (±2-3%)
    const addRandomVariation = (value: number) => {
      const variation = Math.random() * 0.06 - 0.03; // ±3%
      return value * (1 + variation);
    };

    if (isHp) {
      // ---- HÄSTKRAFT (HP) KURVA ----
      const startPercentage = isDiesel ? 0.45 : 0.35; // Diesel startar högre
      const peakStepPercentage = isDiesel ? 0.6 : 0.7; // Bensin peakar senare

      const peakStep = Math.floor(totalSteps * peakStepPercentage);

      return rpmRange.map((_, i) => {
        let value: number;

        if (i <= peakStep) {
          // Ökning till toppen
          const progress = i / peakStep;
          // Diesel: snabbare uppgång, Bensin: lite jämnare
          const curveFactor = isDiesel ? Math.pow(progress, 0.9) : progress;
          value =
            peakValue * (startPercentage + (1 - startPercentage) * curveFactor);
        } else {
          // Minskning efter toppen
          const progress = (i - peakStep) / (totalSteps - 1 - peakStep);
          // Diesel: långsammare minskning, Bensin: snabbare
          const dropRate = isDiesel ? 0.15 : 0.25;
          value = peakValue * (1 - dropRate * Math.pow(progress, 1.2));
        }

        return addRandomVariation(value);
      });
    } else {
      // ---- VRIDMOMENT (NM) KURVA ----
      const startPercentage = isDiesel ? 0.6 : 0.4; // Diesel har mer bottenvrid
      const peakStepPercentage = isDiesel ? 0.3 : 0.4; // Diesel peakar tidigare
      const plateauLength = isDiesel ? 3 : 2; // Diesel har längre platå

      const peakStep = Math.floor(totalSteps * peakStepPercentage);
      const plateauEndStep = Math.min(peakStep + plateauLength, totalSteps - 1);

      return rpmRange.map((_, i) => {
        let value: number;

        if (i < peakStep) {
          // Snabb ökning till toppen
          const progress = i / peakStep;
          // Exponentiell ökning för mer realistisk kurva
          value =
            peakValue *
            (startPercentage + (1 - startPercentage) * Math.pow(progress, 1.3));
        } else if (i <= plateauEndStep) {
          // Platå - håller maxvärdet med liten variation
          const plateauProgress = (i - peakStep) / (plateauEndStep - peakStep);
          // Liten kurva på platån för att undvika perfekt rak linje
          const plateauVariation = Math.sin(plateauProgress * Math.PI) * 0.02;
          value = peakValue * (0.98 + plateauVariation);
        } else {
          // Minskning efter platån
          const progress =
            (i - plateauEndStep) / (totalSteps - 1 - plateauEndStep);
          // Diesel: långsammare minskning
          const dropRate = isDiesel ? 0.2 : 0.3;
          value = peakValue * (1 - dropRate * Math.pow(progress, 1.1));
        }

        return addRandomVariation(value);
      });
    }
  };
  const rpmLabels = useMemo(() => {
    return selectedEngine?.fuel?.toLowerCase().includes("diesel")
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
  }, [selectedEngine?.fuel]);

  const toggleStage = (stageName: string) => {
    setExpandedStages((prev) => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = key === stageName ? !prev[key] : false;
      });
      return newState;
    });
  };
  const toggleOption = (optionId: string) => {
    setExpandedOptions((prev) => {
      const newState: Record<string, boolean> = {};
      newState[optionId] = !prev[optionId];
      return newState;
    });
  };
  const handleBrandChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected({ brand: e.target.value, model: "", year: "", engine: "" });
  };
  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected((prev) => ({
      ...prev,
      model: e.target.value,
      year: "",
      engine: "",
    }));
  };
  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected((prev) => ({ ...prev, year: e.target.value, engine: "" }));
  };
  const handleEngineChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelected((prev) => ({ ...prev, engine: e.target.value }));
  };

  const portableTextComponents = {
    types: {
      image: ({ value }: any) => (
        <img
          src={urlFor(value).width(100).url()}
          alt={value.alt || ""}
          className="my-4 rounded-lg shadow-md"
          loading="lazy"
          decoding="async"
        />
      ),
    },
    marks: {
      link: ({ children, value }: any) => (
        <a
          href={value.href}
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {children}
        </a>
      ),
    },
  };

  const toggleAktPlus = (stageName: string) => {
    setExpandedAktPlus((prev) => ({ ...prev, [stageName]: !prev[stageName] }));
  };

  const createDynamicDescription = (
    description: any[],
    stage: Stage | undefined,
  ) => {
    if (
      !selected.brand ||
      !selected.model ||
      !selected.year ||
      !selected.engine ||
      !stage ||
      !Array.isArray(description)
    ) {
      return description;
    }

    const hkIncrease =
      stage.tunedHk && stage.origHk ? stage.tunedHk - stage.origHk : "?";
    const nmIncrease =
      stage.tunedNm && stage.origNm ? stage.tunedNm - stage.origNm : "?";

    const newDescription = JSON.parse(JSON.stringify(description));

    newDescription.forEach((block: any) => {
      if (block._type === "block" && Array.isArray(block.children)) {
        block.children.forEach((child: any) => {
          if (child._type === "span" && typeof child.text === "string") {
            child.text = child.text
              .replace(/{{brand}}/g, selected.brand)
              .replace(/{{model}}/g, selected.model)
              .replace(/{{year}}/g, selected.year)
              .replace(/{{engine}}/g, selected.engine)
              .replace(/{{stageName}}/g, stage.name)
              .replace(/{{origHk}}/g, String(stage.origHk))
              .replace(/{{tunedHk}}/g, String(stage.tunedHk))
              .replace(/{{hkIncrease}}/g, String(hkIncrease))
              .replace(/{{origNm}}/g, String(stage.origNm))
              .replace(/{{tunedNm}}/g, String(stage.tunedNm))
              .replace(/{{nmIncrease}}/g, String(nmIncrease));
          }
        });
      }
    });

    return newDescription;
  };

  return (
    <>
      <Head>
        <title>{dynamicTitle}</title>
        <meta
          name="description"
          content={
            selected.brand
              ? cleanText(
                  `Motoroptimering för ${selected.brand} ${selected.model} ${selected.year} ${selected.engine} – Effektökning, bränslebesparing & trygg mjukvara.`,
                )
              : cleanText(
                  "Skräddarsydd Motoroptimering – Effektökning, bränslebesparing & trygg mjukvara. AK-TUNING finns i Göteborg - Stockholm - Skåne - Jönköping - Örebro",
                )
          }
        />
        <link rel="canonical" href="https://tuning.aktuning.se/" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          property="og:title"
          content="Motoroptimering i Göteborg, Stockholm, Skåne, Jönköping & Örebro | AK-TUNING"
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
              "@type": "LocalBusiness",
              name: "AK-TUNING Motoroptimering",
              image: "https://tuning.aktuning.se/ak-logo1.png",
              "@id": "https://tuning.aktuning.se",
              url: "https://tuning.aktuning.se",
              telephone: "031-382 33 00",
              priceRange: "$$",
              address: {
                "@type": "PostalAddress",
                addressCountry: "SE",
              },
              areaServed: [
                "Göteborg",
                "Stockholm",
                "Skåne",
                "Jönköping",
                "Örebro",
              ],
              sameAs: [
                "https://www.facebook.com/aktuned",
                "https://www.instagram.com/aktuning.se",
              ],
            }),
          }}
        />
      </Head>

      <div className="w-full max-w-6xl mx-auto px-2 py-4 sm:px-4">
        {/* TOPBAR: logga, regnr, språk + vy */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between relative mb-8">
          {/* Vänster: Logga */}
          <div className="flex justify-between items-center">
            <Image
              src="/ak-logo2.png"
              alt="AK-TUNING MOTOROPTIMERING"
              width={110}
              height={120}
              className="h-full object-contain cursor-pointer hover:opacity-90"
              onClick={() => {
                setSelected({ brand: "", model: "", year: "", engine: "" });
                window.parent.postMessage({ scrollToIframe: true }, "*");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              priority
            />

            {/* Höger på mobil: språk + vy */}
            <div className="sm:hidden flex items-center gap-3">
              <PublicLanguageDropdown
                currentLanguage={currentLanguage}
                setCurrentLanguage={setCurrentLanguage}
              />
              <button
                onClick={toggleViewMode}
                className={`p-2 rounded-full border transition-all shadow-sm ${
                  viewMode === "card"
                    ? "bg-red-100 border-gray-300 text-gray-700"
                    : "bg-red-600 border-red-600 text-white"
                }`}
                aria-label="Byt vy"
              >
                {viewMode === "card" ? (
                  <List className="w-5 h-5" />
                ) : (
                  <LayoutGrid className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Mitten (desktop), under (mobil): REGNR */}
          {!selected.brand && currentLanguage === "sv" && (
            <div className="mt-4 sm:absolute sm:top-0 sm:left-1/2 sm:-translate-x-1/2">
              <div className="mx-auto max-w-md">
                <RegnrSearch
                  onVehicleFound={handleVehicleFound}
                  onError={setSearchError}
                  disabled={isVehicleDbLoading} // Använd det nya loading-statet
                  onOpen={loadVehicleData} // Skicka med den nya funktionen
                />
              </div>
            </div>
          )}

          {/* Höger (desktop): språk + vy */}
          <div className="hidden sm:flex items-center gap-4">
            <PublicLanguageDropdown
              currentLanguage={currentLanguage}
              setCurrentLanguage={setCurrentLanguage}
            />
            <button
              onClick={toggleViewMode}
              className={`p-2 rounded-full border transition-all shadow-sm ${
                viewMode === "card"
                  ? "bg-red-100 border-gray-300 text-gray-700"
                  : "bg-red-600 border-red-600 text-white"
              }`}
              aria-label="Byt vy"
            >
              {viewMode === "card" ? (
                <List className="w-5 h-5" />
              ) : (
                <LayoutGrid className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <div className="mb-4 text-center">
          {!selected.brand ? (
            <p className="text-black text-lg font-semibold">
              {translate(currentLanguage, "headline")}
            </p>
          ) : selected.engine ? (
            <div>
              <p className="text-black text-lg font-semibold mb-2">
                {translate(currentLanguage, "tuningIntro")}{" "}
                {cleanText(selected.brand)}{" "}
                {formatModelName(selected.brand, cleanText(selected.model))}{" "}
                {cleanText(selected.year)} – {cleanText(selected.engine)}
              </p>
              <button
                onClick={() => {
                  setSelected((prev) => ({
                    ...prev,
                    engine: "",
                  }));
                }}
                className="text-sm text-orange-500 hover:underline"
              >
                ← {translate(currentLanguage, "BACKTO")} {selected.year}
              </button>
            </div>
          ) : null}
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
                  .filter((b) => !b.startsWith("[LASTBIL]"))
                  .sort((a, b) => a.localeCompare(b))
                  .concat(
                    brands
                      .filter((b) => b.startsWith("[LASTBIL]"))
                      .sort((a, b) => a.localeCompare(b)),
                  )
                  .map((brand) => (
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
                {models.map((m) => (
                  <option key={m.name} value={m.name}>
                    {formatModelName(selected.brand, m.name)}
                  </option>
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
                {years.map((y) => (
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
                    {engines.map((engine) => (
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
          <div className="mb-8">
            {/* Brand selection */}
            {!selected.brand && (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  {translate(currentLanguage, "selectBrand")}
                </h2>

                {/* 🚗 Personbilar */}
                <div className="mb-6">
                  <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
                    {translate(currentLanguage, "Personbilar")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {brands
                      .filter((b) => !b.startsWith("[LASTBIL]"))
                      .sort((a, b) => a.localeCompare(b))
                      .map((brand) => {
                        const brandData = data.find((b) => b.name === brand);
                        const logoUrl = brandData?.logo?.asset
                          ? urlFor(brandData.logo).width(200).url()
                          : null;

                        return (
                          <div
                            key={brand}
                            onClick={() => {
                              setSelected({
                                brand,
                                model: "",
                                year: "",
                                engine: "",
                              });

                              window.parent.postMessage(
                                { scrollToIframe: true },
                                "*",
                              );
                            }}
                            className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                             transition-all duration-200 shadow-sm hover:shadow-md 
                             hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                          >
                            {logoUrl && (
                              <Image
                                src={logoUrl}
                                alt={brand}
                                width={80}
                                height={80}
                                className="object-contain mb-2"
                                loading="lazy"
                              />
                            )}
                            <p className="text-center font-medium text-gray-800">
                              {brand}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* 🚛 Lastbilar */}
                <div>
                  <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
                    {translate(currentLanguage, "Lastbilar")}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {brands
                      .filter((b) => b.startsWith("[LASTBIL]"))
                      .sort((a, b) => a.localeCompare(b))
                      .map((brand) => {
                        const brandData = data.find((b) => b.name === brand);
                        return (
                          <div
                            key={brand}
                            onClick={() => {
                              setSelected({
                                brand,
                                model: "",
                                year: "",
                                engine: "",
                              });

                              window.parent.postMessage(
                                { scrollToIframe: true },
                                "*",
                              );
                            }}
                            className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                             transition-all duration-200 shadow-sm hover:shadow-md 
                             hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                          >
                            {brandData?.logo?.asset && (
                              <Image
                                src={urlFor(brandData.logo).width(250).url()}
                                alt={brand}
                                width={100}
                                height={100}
                                className="object-contain mb-2"
                                loading="lazy"
                              />
                            )}
                            <p className="text-center font-medium text-gray-800">
                              {brand
                                .replace("[LASTBIL] ", "")
                                .replace(/^-/, "")}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </>
            )}

            {/* Model selection */}
            {selected.brand && !selected.model && (
              <>
                <button
                  onClick={() => {
                    setSelected({ brand: "", model: "", year: "", engine: "" });

                    window.parent.postMessage({ scrollToIframe: true }, "*");
                  }}
                  className="group flex items-center gap-1 mb-4 hover:text-blue-800 
                   transition-colors duration-200 rounded-md px-2 py-1 hover:bg-gray-200"
                >
                  <svg
                    className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                  <span className="font-semibold">
                    {translate(currentLanguage, "BACKTOMARKE")}
                  </span>
                </button>

                <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 mb-4">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span className="text-gray-600 font-semibold">
                    {translate(currentLanguage, "selectModel")}
                  </span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {models.map((model) => (
                    <div
                      key={model.name}
                      onClick={() => {
                        setSelected((prev) => ({
                          ...prev,
                          model: model.name,
                          year: "",
                          engine: "",
                        }));

                        window.parent.postMessage(
                          { scrollToIframe: true },
                          "*",
                        );
                      }}
                      className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                       transition-all duration-200 shadow-sm hover:shadow-md 
                       hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                    >
                      <Image
                        src={getModelImage(model.name, selected.brand)}
                        alt={`${selected.brand} ${formatModelName(selected.brand, model.name)}`}
                        width={250}
                        height={100}
                        className="h-16 w-auto object-contain mb-2"
                        loading="lazy"
                      />
                      <p className="text-center font-medium text-gray-800">
                        {formatModelName(selected.brand, model.name)}
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
                  onClick={() => {
                    setSelected((prev) => ({
                      ...prev,
                      model: "",
                      year: "",
                      engine: "",
                    }));

                    window.parent.postMessage({ scrollToIframe: true }, "*");
                  }}
                  className="group flex items-center gap-1 mb-4 hover:text-blue-800 
                   transition-colors duration-200 rounded-md px-2 py-1 hover:bg-gray-200"
                >
                  <svg
                    className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                    />
                  </svg>
                  <span className="font-semibold">
                    {translate(currentLanguage, "BACKTO")}{" "}
                    {selected.brand.replace("[LASTBIL] ", "")}
                  </span>
                </button>

                <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 mb-4">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                  <span className="text-gray-600 font-semibold">
                    {translate(currentLanguage, "selectYear")}
                  </span>
                </h2>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {years.map((year) => (
                    <div
                      key={year.range}
                      onClick={() => {
                        setSelected((prev) => ({
                          ...prev,
                          year: year.range,
                          engine: "",
                        }));

                        window.parent.postMessage(
                          { scrollToIframe: true },
                          "*",
                        );
                      }}
                      className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                       transition-all duration-200 shadow-sm hover:shadow-md 
                       hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
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
                    onClick={() => {
                      setSelected((prev) => ({
                        ...prev,
                        year: "",
                        engine: "",
                      }));

                      window.parent.postMessage({ scrollToIframe: true }, "*");
                    }}
                    className="group flex items-center gap-1 mb-4 hover:text-blue-800 
                   transition-colors duration-200 rounded-md px-2 py-1 hover:bg-gray-200"
                  >
                    <svg
                      className="w-5 h-5 transition-transform duration-200 group-hover:-translate-x-1"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                      />
                    </svg>
                    <span className="font-semibold">
                      {translate(currentLanguage, "BACKTO")}{" "}
                      {selected.brand.replace("[LASTBIL] ", "")}{" "}
                      {formatModelName(selected.brand, selected.model)}
                    </span>
                  </button>

                  <h2 className="flex items-center justify-center gap-2 text-xl font-bold text-gray-900 mb-4">
                    <svg
                      className="w-5 h-5 text-red-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                    <span className="text-gray-600 font-semibold">
                      {translate(currentLanguage, "selectEngine")}
                    </span>
                  </h2>

                  {/* Engine lists */}
                  {["diesel", "bensin"].map((fuel) => {
                    const filtered = engines.filter((e) =>
                      e.fuel.toLowerCase().includes(fuel),
                    );
                    if (filtered.length === 0) return null;

                    return (
                      <div className="mb-6" key={fuel}>
                        <h3 className="text-md font-semibold mb-3 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                          {translate(
                            currentLanguage,
                            fuel === "diesel" ? "fuelDiesel" : "fuelPetrol",
                          )}
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {filtered.map((engine) => (
                            <div
                              key={engine.label}
                              onClick={() => {
                                setSelected((prev) => ({
                                  ...prev,
                                  engine: engine.label,
                                }));

                                window.parent.postMessage(
                                  { scrollToIframe: true },
                                  "*",
                                );
                              }}
                              className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                             transition-all duration-200 shadow-sm hover:shadow-md 
                             hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
                            >
                              <p className="text-center font-medium text-gray-800">
                                {engine.label}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Other engines */}
                  {engines.filter(
                    (e) =>
                      !["diesel", "bensin"].some((f) =>
                        e.fuel.toLowerCase().includes(f),
                      ),
                  ).length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-md font-semibold mb-3 text-gray-700 bg-gray-100 px-3 py-2 rounded-md">
                        {translate(currentLanguage, "otherEngines")}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {engines
                          .filter(
                            (e) =>
                              !["diesel", "bensin"].some((f) =>
                                e.fuel.toLowerCase().includes(f),
                              ),
                          )
                          .map((engine) => (
                            <div
                              key={engine.label}
                              onClick={() => {
                                setSelected((prev) => ({
                                  ...prev,
                                  engine: engine.label,
                                }));

                                window.parent.postMessage(
                                  { scrollToIframe: true },
                                  "*",
                                );
                              }}
                              className="cursor-pointer rounded-xl p-4 bg-white hover:bg-gray-50 border border-gray-200 
                             transition-all duration-200 shadow-sm hover:shadow-md 
                             hover:scale-105 active:scale-95 flex flex-col items-center justify-center"
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
            {stages.map((stage) => {
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
                        {data.find((b) => b.name === selected.brand)?.logo
                          ?.asset && (
                          <Image
                            src={urlFor(
                              data.find((b) => b.name === selected.brand)?.logo,
                            )
                              .width(60)
                              .url()}
                            alt={selected.brand}
                            width={80}
                            height={32}
                            className="h-8 w-auto object-contain"
                            loading="lazy"
                          />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                          {selected.engine} -{" "}
                          <span
                            className={`uppercase tracking-wide ${getStageColor(
                              stage.name,
                            )}`}
                          >
                            [{translateStageName(currentLanguage, stage.name)}]
                          </span>
                        </h2>
                      </div>

                      <div className="mt-3 md:mt-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-center">
                        <Image
                          src={`/badges/${stage.name.toLowerCase().replace(/\s+/g, "")}.png`}
                          alt={`${selected.brand} ${formatModelName(selected.brand, selected.model)} ${selected.engine} – ${stage.name}`}
                          width={66}
                          height={32}
                          className="h-8 object-contain"
                          loading="lazy"
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
                              "stageContactForHardware",
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

                  {isExpanded &&
                    (() => {
                      // OPTIMIZATION: All expensive calculations and variables are now inside this block.
                      // They will only run when `isExpanded` is true.
                      const isDsgStage = stage.name
                        .toLowerCase()
                        .includes("dsg");
                      const isTruck = selected.brand.startsWith("[LASTBIL]");
                      const allOptions = getAllAktPlusOptions(stage);
                      const descriptionObject =
                        stage.descriptionRef?.description || stage.description;
                      let rawDescription = null;

                      if (descriptionObject) {
                        if (
                          typeof descriptionObject === "object" &&
                          !Array.isArray(descriptionObject)
                        ) {
                          rawDescription =
                            descriptionObject[currentLanguage] ||
                            descriptionObject["sv"] ||
                            [];
                        } else if (Array.isArray(descriptionObject)) {
                          rawDescription = descriptionObject;
                        }
                      }

                      const dynamicDescription = rawDescription
                        ? createDynamicDescription(rawDescription, stage)
                        : null;

                      // OPTIMIZATION: All heavy components below will only be mounted and rendered
                      // when this block is executed.
                      return (
                        <>
                          {isTruck && <FuelSavingCalculator stage={stage} />}
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
                                      {stage.tcuFields.launchControl.original ||
                                        "-"}{" "}
                                      RPM
                                    </p>
                                    <p>
                                      Optimerad:{" "}
                                      <span className="text-green-400">
                                        {stage.tcuFields.launchControl
                                          .optimized || "-"}{" "}
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
                                      {stage.tcuFields.rpmLimit.original || "-"}{" "}
                                      RPM
                                    </p>
                                    <p>
                                      Optimerad:{" "}
                                      <span className="text-green-400">
                                        {stage.tcuFields.rpmLimit.optimized ||
                                          "-"}{" "}
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
                                      {stage.tcuFields.shiftTime.original ||
                                        "-"}{" "}
                                      ms
                                    </p>
                                    <p>
                                      Optimerad:{" "}
                                      <span className="text-green-400">
                                        {stage.tcuFields.shiftTime.optimized ||
                                          "-"}{" "}
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
                                      stage.name,
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
                                      stage.name,
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
                                  setInfoModal({
                                    open: true,
                                    type: "stage",
                                    stage,
                                  })
                                }
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                              >
                                📄{" "}
                                {translate(
                                  currentLanguage,
                                  "translateStageName",
                                  stage.name,
                                ).toUpperCase()}{" "}
                                {translate(currentLanguage, "infoStage")}
                              </button>
                              {/* Hidden SEO content for stage info */}
                              <div className="sr-only">
                                <h2>{stage.name.toUpperCase()} INFORMATION</h2>
                                {dynamicDescription && (
                                  <PortableText
                                    value={dynamicDescription}
                                    components={portableTextComponents}
                                  />
                                )}
                              </div>

                              <button
                                onClick={() =>
                                  setInfoModal({ open: true, type: "general" })
                                }
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                              >
                                💡 {translate(currentLanguage, "infoGeneral")}
                              </button>
                            </div>
                            {/* Hidden SEO content for general info */}
                            <div className="sr-only">
                              <h2>GENERELL INFORMATION</h2>
                              <div>
                                <ul className="space-y-2">
                                  <li>
                                    ✅ All mjukvara är skräddarsydd för din bil
                                  </li>
                                  <li>
                                    ✅ Felsökning inann samt efter optimering
                                  </li>
                                  <li>
                                    ✅ Loggning för att anpassa en individuell
                                    mjukvara
                                  </li>
                                  <li>
                                    ✅ Optimerad för både prestanda och
                                    bränsleekonomi
                                  </li>
                                </ul>
                                <div className="mt-6 text-sm text-gray-400 leading-relaxed">
                                  <p>
                                    AK-TUNING är specialister på skräddarsydd
                                    motoroptimering, chiptuning och
                                    ECU-programmering för alla bilmärken.
                                  </p>
                                  <p className="mt-2">
                                    Vi erbjuder effektökning, bättre
                                    bränsleekonomi och optimerade köregenskaper.
                                    Tjänster i Göteborg, Stockholm, Malmö,
                                    Jönköping, Örebro och Storvik.
                                  </p>
                                  <p className="mt-2">
                                    All mjukvara utvecklas in-house med fokus på
                                    kvalitet, säkerhet och lång livslängd.
                                    Välkommen till en ny nivå av bilprestanda
                                    med AK-TUNING.
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-6">
                              {!isDsgStage && !isTruck && (
                                <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                                  {translate(
                                    currentLanguage,
                                    "translateStageName",
                                    stage.name,
                                  ).toUpperCase()}{" "}
                                </h3>
                              )}

                              {/* Mobile-only legend above chart - TEXT VERSION */}
                              {!isDsgStage && !isTruck && (
                                <div className="flex justify-center items-center gap-4 md:hidden text-xs text-white mb-2">
                                  <div className="flex items-center gap-1">
                                    <span className="text-red-400 font-mono text-[12px] tracking-wide drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]">
                                      --
                                    </span>
                                    <span className="text-white">ORG HK</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-red-600 font-mono text-[12px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                      ━━
                                    </span>
                                    <span className="text-white">
                                      {stage.name
                                        .replace("Steg", "ST")
                                        .replace(/\s+/g, "")
                                        .toUpperCase()}{" "}
                                      HK
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-white font-mono text-[12px] tracking-wide drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]">
                                      --
                                    </span>
                                    <span className="text-white">ORG NM</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="text-white font-mono text-[12px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                      ━━
                                    </span>
                                    <span className="text-white">
                                      {stage.name
                                        .replace("Steg", "ST")
                                        .replace(/\s+/g, "")
                                        .toUpperCase()}{" "}
                                      NM
                                    </span>
                                  </div>
                                </div>
                              )}

                              {!isDsgStage && !isTruck && (
                                <div className="h-96 bg-gray-900 rounded-lg p-4 relative">
                                  {/* Split the spec boxes */}
                                  <div className="absolute hidden md:flex flex-row justify-between top-4 left-0 right-0 px-16">
                                    {/* HK Container */}
                                    <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-red-400 font-mono text-[16px] tracking-wide drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]">
                                          ---
                                        </span>
                                        <span className="text-white">
                                          ORG: {stage.origHk} HK
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-red-600 font-mono text-[16px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                          ━━━
                                        </span>
                                        <span className="text-white">
                                          <span className="text-white text-[14px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                            ST{stage.name.replace(/\D/g, "")}:{" "}
                                            {stage.tunedHk} HK
                                          </span>
                                        </span>
                                      </div>
                                    </div>

                                    {/* NM Container */}
                                    <div className="bg-gray-900 px-4 py-1 rounded text-xs text-white flex flex-col items-start w-auto">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-mono text-[16px] tracking-wide drop-shadow-[0_0_3px_rgba(248,113,113,0.8)]">
                                          ---
                                        </span>
                                        <span className="text-white">
                                          ORG: {stage.origNm} NM
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-mono text-[16px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                          ━━━
                                        </span>
                                        <span className="text-white">
                                          <span className="text-white text-[14px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                            ST{stage.name.replace(/\D/g, "")}:{" "}
                                            {stage.tunedNm} NM
                                          </span>
                                        </span>
                                      </div>
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
                                            selectedEngine.fuel,
                                          ),
                                          borderColor: "#f87171",
                                          backgroundColor: "#000000",
                                          borderWidth: 2,
                                          borderDash: [5, 3],
                                          tension: 0.5,
                                          pointRadius: 0,
                                          yAxisID: "hp",
                                        },
                                        {
                                          label: `ST ${stage.name.replace(
                                            /\D/g,
                                            "",
                                          )} HK`,
                                          data: generateDynoCurve(
                                            stage.tunedHk,
                                            true,
                                            selectedEngine.fuel,
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
                                            selectedEngine.fuel,
                                          ),
                                          borderColor: "#d1d5db",
                                          backgroundColor: "#000000",
                                          borderWidth: 2,
                                          borderDash: [5, 3],
                                          tension: 0.5,
                                          pointRadius: 0,
                                          yAxisID: "nm",
                                        },
                                        {
                                          label: `ST ${stage.name.replace(
                                            /\D/g,
                                            "",
                                          )} NM`,
                                          data: generateDynoCurve(
                                            stage.tunedNm,
                                            false,
                                            selectedEngine.fuel,
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
                                          usePointStyle: true,
                                          callbacks: {
                                            labelPointStyle: () => ({
                                              pointStyle: "circle",
                                              rotation: 0,
                                            }),
                                            title: function (tooltipItems) {
                                              return `${tooltipItems[0].label} RPM`;
                                            },
                                            label: function (context) {
                                              const label =
                                                context.dataset.label || "";
                                              const value = context.parsed.y;

                                              if (value === undefined)
                                                return label;

                                              const unit =
                                                context.dataset.yAxisID === "hp"
                                                  ? "hk"
                                                  : "Nm";
                                              return `${label}: ${Math.round(
                                                value,
                                              )} ${unit}`;
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
                                            font: { size: 14 },
                                          },
                                          min: 0,
                                          max:
                                            Math.ceil(stage.tunedHk / 100) *
                                              100 +
                                            100,
                                          grid: {
                                            color: "rgba(255, 255, 255, 0.1)",
                                          },
                                          ticks: {
                                            color: "#9CA3AF",
                                            stepSize: 100,
                                            callback: (value) => `${value}`,
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
                                            font: { size: 14 },
                                          },
                                          min: 0,
                                          max:
                                            Math.ceil(stage.tunedNm / 100) *
                                              100 +
                                            100,
                                          grid: {
                                            drawOnChartArea: false,
                                          },
                                          ticks: {
                                            color: "#9CA3AF",
                                            stepSize: 100,
                                            callback: (value) => `${value}`,
                                          },
                                        },
                                        x: {
                                          title: {
                                            display: true,
                                            text: "RPM",
                                            color: "#E5E7EB",
                                            font: { size: 14 },
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
                                    {translate(
                                      currentLanguage,
                                      "tuningCurveNote",
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* small tuned specs */}
                              {!isDsgStage && (
                                <div className="mt-8 mb-10">
                                  {/* Performance Summary */}
                                  <div className="text-center mb-6">
                                    <p className="text-lg font-semibold text-white">
                                      {translate(
                                        currentLanguage,
                                        "tuningIntro",
                                      )}{" "}
                                      <span
                                        className={getStageColor(stage.name)}
                                      >
                                        {stage.name
                                          .replace(
                                            "Steg",
                                            translate(
                                              currentLanguage,
                                              "stageLabel",
                                            ),
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
                                      onClick={(e) =>
                                        handleBookNow(stage.name, e)
                                      }
                                      className="bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                                    >
                                      📩{" "}
                                      {translate(
                                        currentLanguage,
                                        "contactvalue",
                                      )}
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
                                    <Image
                                      src="/logos/aktplus.png"
                                      alt="AKT+ Logo"
                                      width={120}
                                      height={32}
                                      className="h-8 w-auto object-contain"
                                      loading="lazy"
                                    />
                                    <h3 className="text-xl font-semibold text-white">
                                      {translate(
                                        currentLanguage,
                                        "additionsLabel",
                                      )}
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
                                    {allOptions.map((option) => {
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
                                            onClick={() =>
                                              toggleOption(option._id)
                                            }
                                            className="w-full flex justify-between items-center p-4 hover:bg-gray-600 transition-colors"
                                          >
                                            <div className="flex items-center gap-3">
                                              {option.gallery?.[0]?.asset && (
                                                <Image
                                                  src={urlFor(
                                                    option.gallery[0].asset,
                                                  )
                                                    .width(80)
                                                    .url()}
                                                  alt={`${selected.brand} ${formatModelName(selected.brand, selected.model)} ${selected.year} ${selected.engine} – ${translatedTitle}`}
                                                  width={80}
                                                  height={80}
                                                  className="h-10 w-10 object-contain"
                                                  loading="lazy"
                                                />
                                              )}
                                              <span className="text-lg font-bold text-orange-600">
                                                {translatedTitle}
                                              </span>
                                            </div>

                                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-800">
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
                                            </div>
                                          </button>

                                          {expandedOptions[option._id] && (
                                            <div className="bg-gray-800 border-t border-gray-600 p-4 space-y-4">
                                              {translatedDescription && (
                                                <div className="prose prose-invert max-w-none text-sm">
                                                  <PortableText
                                                    value={
                                                      translatedDescription
                                                    }
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
                                                      "priceLabel",
                                                    )}
                                                    :{" "}
                                                    {option.price.toLocaleString()}{" "}
                                                    kr
                                                  </p>
                                                )}

                                                <button
                                                  onClick={() =>
                                                    handleBookNow(
                                                      translatedTitle,
                                                    )
                                                  }
                                                  className="bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                                                >
                                                  📩{" "}
                                                  {translate(
                                                    currentLanguage,
                                                    "contactvalue",
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
                        </>
                      );
                    })()}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Modal */}
        <ContactModal
          isOpen={contactModalData.isOpen}
          onClose={() =>
            setContactModalData({ isOpen: false, stageOrOption: "", link: "" })
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
          onClose={() => setInfoModal({ open: false, type: infoModal.type })}
          title={
            infoModal.type === "stage" && infoModal.stage
              ? infoModal.stage.name.replace(/^steg/i, "STEG").toUpperCase()
              : translate(currentLanguage, "generalInfoLabel")
          }
          id={
            infoModal.type === "stage"
              ? `${slugify(infoModal.stage?.name || "")}-modal`
              : "general-info-modal"
          }
          content={
            infoModal.type === "stage" && infoModal.stage ? (
              (() => {
                const descriptionObject =
                  infoModal.stage?.descriptionRef?.description ||
                  infoModal.stage?.description;

                let rawDescription = null;
                if (Array.isArray(descriptionObject)) {
                  rawDescription = descriptionObject;
                } else if (
                  typeof descriptionObject === "object" &&
                  descriptionObject !== null
                ) {
                  rawDescription =
                    descriptionObject[currentLanguage] ||
                    descriptionObject["sv"] ||
                    [];
                }

                if (rawDescription) {
                  const dynamicContent = createDynamicDescription(
                    rawDescription,
                    infoModal.stage,
                  );
                  return (
                    <PortableText
                      value={dynamicContent}
                      components={portableTextComponents}
                    />
                  );
                }

                return <p>Information saknas.</p>;
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
                  <p>{translate(currentLanguage, "aboutUs1")}</p>
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
          setContactModalData={setContactModalData}
          currentLanguage={currentLanguage}
          translate={translate}
          showBookButton={infoModal.type === "stage"}
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
  setContactModalData,
  currentLanguage,
  translate,
  showBookButton,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  id: string;
  setContactModalData: React.Dispatch<
    React.SetStateAction<{
      isOpen: boolean;
      stageOrOption: string;
      link: string;
      scrollPosition?: number;
    }>
  >;
  currentLanguage: string;
  translate: (lang: string, key: string, fallback?: string) => string;
  showBookButton: boolean;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
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

        <div className="mt-6 flex justify-between">
          {showBookButton && (
            <button
              onClick={() => {
                setContactModalData({
                  isOpen: true,
                  stageOrOption: title,
                  link: window.location.href,
                  scrollPosition: isMobile ? undefined : 0,
                });
                onClose();
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              📅 {translate(currentLanguage, "bookNow")}
            </button>
          )}

          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-orange-500 ml-auto"
          >
            ❌ {translate(currentLanguage, "close")}
          </button>
        </div>
      </div>
    </div>
  );
};

// pages/reseller/[resellerId]/index.tsx;
import Head from "next/head";
import React, { useEffect, useState, useRef, useMemo } from "react";
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
import { PortableText } from "@portabletext/react";
import { urlFor } from "@/lib/sanity";
import { t as translate } from "@/lib/translations";
import type {
  Brand,
  Stage,
  AktPlusOption,
  AktPlusOptionReference,
} from "@/types/sanity";
import ResellerContactModal from "@/components/ResellerContactModal";
import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { link } from "fs";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend,
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

interface DisplaySettings {
  showAktPlus: boolean;
  showBrandLogo: boolean;
  showStageLogo: boolean;
  showDynoChart: boolean;
}

interface ResellerSettings {
  logo?: any;
  currency: string;
  language: string;
  aktPlusLogo?: any;
  enableLanguageSwitcher?: boolean;
  secondaryLanguage?: string | null;
  exchangeRates: Record<string, number>;
  displaySettings?: {
    showAktPlus: boolean;
    showBrandLogo: boolean;
    showStageLogo: boolean;
    showDynoChart: boolean;
  };
}

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => (
    <div className="h-96 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-400">Laddar dynobild...</p>
    </div>
  ),
});

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { resellerId } = context.params as { resellerId: string };

  const isValid = await client.fetch(
    `count(*[_type == "resellerUser" && resellerId == $resellerId]) > 0`,
    { resellerId },
  );

  if (!isValid) {
    return {
      notFound: true,
    };
  }

  return {
    props: {}, // Skicka props om du vill använda t.ex. `resellerId` senare
  };
};

export default function TuningViewer() {
  const [data, setData] = useState<Brand[]>([]);
  const [selected, setSelected] = useState<SelectionState>({
    brand: "",
    model: "",
    year: "",
    engine: "",
  });

  const router = useRouter();

  const { resellerId } = router.query as { resellerId?: string };
  const [resellerLogo, setResellerLogo] = useState<string | null>(null);
  // Defaultvärden för inställningar
  const defaultSettings = {
    currency: "SEK",
    language: "sv",
    exchangeRates: {
      SEK: 1,
      EUR: 0.1,
      USD: 0.1,
      GBP: 0.08,
      THB: 3.5,
      JPY: 14.0,
      CNY: 0.68,
      RUB: 8.5,
      TRY: 3.1,
      PLN: 0.42,
      CZK: 2.3,
      HUF: 35.0,
      AED: 0.35,
      KRW: 125.0,
      NOK: 1.0,
      DKK: 0.7,
      CHF: 0.085,
      AUD: 0.14,
      CAD: 0.13,
      INR: 7.8,
      SGD: 0.13,
      NZD: 0.15,
      ZAR: 1.7,
      BRL: 0.5,
      MXN: 1.8,
    },
  };

  // State för inställningar, språk, och logotyp
  const [settings, setSettings] = useState<ResellerSettings>(defaultSettings);
  const [currentLanguage, setCurrentLanguage] = useState(
    defaultSettings.language,
  );

  // Stage + AKTplus (kan ligga kvar under detta)
  const [stageDescriptions, setStageDescriptions] = useState([]);
  const [aktPlusOptions, setAktPlusOptions] = useState<
    {
      id: string;
      title: string;
      description: any[];
      isOverride: boolean;
      price: number;
      installationTime: number;
      imageUrl: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (!resellerId) return;

    const fetchOverrides = async () => {
      try {
        const res = await fetch(
          `/api/aktplus-overrides?resellerId=${resellerId}`,
        );
        const json = await res.json();
        setAktPlusOptions(json.aktplus || []);
      } catch (err) {
        console.error("Failed to fetch AKTPLUS overrides:", err);
      }
    };

    fetchOverrides();
  }, [resellerId]);

  useEffect(() => {
    if (!resellerId) return;

    const fetchDescriptions = async () => {
      try {
        const res = await fetch(
          `/api/stage-descriptions?resellerId=${resellerId}`,
        );
        if (!res.ok) throw new Error("Failed to fetch descriptions");
        const json = await res.json();
        setStageDescriptions(json.descriptions || []);
      } catch (err) {
        console.error("Failed to fetch stage descriptions", err);
      }
    };

    fetchDescriptions();
  }, [resellerId]);

  const [generalInfo, setGeneralInfo] = useState<{ content: any }>({
    content: [],
  });

  useEffect(() => {
    if (!resellerId) return;

    const fetchGeneralInfo = async () => {
      const res = await fetch(`/api/general-info?resellerId=${resellerId}`);
      const json = await res.json();
      setGeneralInfo(json.generalInfo || {});
    };

    fetchGeneralInfo();
  }, [resellerId]);

  useEffect(() => {
    if (!resellerId) return;

    const fetchResellerLogo = async () => {
      try {
        const res = await fetch(
          `/api/reseller-config?resellerId=${resellerId}`,
        );
        const json = await res.json();
        if (json.logo?.asset) {
          setResellerLogo(urlFor(json.logo).width(300).quality(100).url());
        }
      } catch (err) {
        console.error("Failed to load reseller logo", err);
      }
    };

    fetchResellerLogo();
  }, [resellerId]);

  useEffect(() => {
    if (!resellerId) return;

    const fetchSettings = async () => {
      const res = await fetch(`/api/reseller-config?resellerId=${resellerId}`);
      const json = await res.json();
      setSettings(json);
      setCurrentLanguage(json.language);
    };

    fetchSettings();
  }, [resellerId]);

  const convertPrice = (priceInSek: number): string => {
    const rate = settings.exchangeRates[settings.currency] || 1;
    const converted = priceInSek * rate;

    const rounded = Math.round(converted / 50) * 50;

    // Currency display symbol or fallback
    const currencySymbols: Record<string, string> = {
      SEK: "kr",
      EUR: "€",
      USD: "$",
      GBP: "£",
      THB: "฿",
      JPY: "¥",
      CNY: "¥",
      RUB: "₽",
      TRY: "₺",
      PLN: "zł",
      CZK: "Kč",
      HUF: "Ft",
      AED: "د.إ",
      KRW: "₩",
      NOK: "kr",
      DKK: "kr",
      CHF: "CHF",
      AUD: "A$",
      CAD: "C$",
      INR: "₹",
      SGD: "S$",
      NZD: "NZ$",
      ZAR: "R",
      BRL: "R$",
      MXN: "MX$",
    };

    const convertPrice = (priceInSek: number): string => {
      const rate = settings.exchangeRates[settings.currency] || 1;
      const converted = priceInSek * rate;
      const rounded = Math.round(converted / 50) * 50;

      const symbol = currencySymbols[settings.currency] || settings.currency;

      return rounded
        .toLocaleString(settings.language, {
          style: "currency",
          currency: settings.currency,
          currencyDisplay: "symbol",
          maximumFractionDigits: 0,
          minimumFractionDigits: 0,
        })
        .replace(settings.currency, symbol);
    };

    const symbol = currencySymbols[settings.currency] || settings.currency;

    // Localized formatting (zero decimal style)
    return rounded
      .toLocaleString(settings.language, {
        style: "currency",
        currency: settings.currency,
        currencyDisplay: "symbol",
        maximumFractionDigits: 0,
        minimumFractionDigits: 0,
      })
      .replace(settings.currency, symbol);
  };

  const updateSettings = async (settings: Partial<DisplaySettings>) => {
    const response = await fetch("/api/update-display-settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(settings),
    });

    if (!response.ok) {
      throw new Error("Failed to update settings");
    }

    return await response.json();
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
      ar: `مرحلة ${stageNum}`,
      da: `Stadie ${stageNum}`,
      no: `Trinn ${stageNum}`,
      nl: `Stage ${stageNum}`,
      fi: `Vaihe ${stageNum}`,
      es: `Etapa ${stageNum}`,
      it: `Stadio ${stageNum}`,
      pt: `Estágio ${stageNum}`,
      ru: `Этап ${stageNum}`,
      zh: `阶段 ${stageNum}`,
      ja: `ステージ ${stageNum}`,
      ko: `단계 ${stageNum}`,
      pl: `Etap ${stageNum}`,
      tr: `Aşama ${stageNum}`,
      hu: `Szint ${stageNum}`,
      cs: `Stupeň ${stageNum}`,
      uk: `Етап ${stageNum}`,
      th: `ขั้นตอน ${stageNum}`,
      ro: `Stage ${stageNum}`,
    };

    return translations[lang] || name;
  };

  const [isLoading, setIsLoading] = useState(true);
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {},
  );
  const [expandedDescriptions, setExpandedDescriptions] = useState<
    Record<string, boolean>
  >({});
  const [expandedOptions, setExpandedOptions] = useState<
    Record<string, boolean>
  >({});
  const watermarkImageRef = useRef<HTMLImageElement | null>(null);

  const [ResellerContactModalData, setResellerContactModalData] = useState<{
    isOpen: boolean;
    stageOrOption: string;
    link: string;
    scrollPosition?: number;
  }>({
    isOpen: false,
    stageOrOption: "",
    link: "",
  });

  const [contactInfo, setContactInfo] = useState("");

  // Fetch contact info on mount (or when needed)
  useEffect(() => {
    const fetchContactInfo = async () => {
      const response = await fetch(
        "api/reseller-config?resellerId=${session.user.resellerId}",
      );
      const json = await response.json();
      if (json.contactInfo) setContactInfo(json.contactInfo);
    };

    fetchContactInfo();
  }, []);

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }>({ open: false, type: "stage" });

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

    const finalLink = `https://api.aktuning.se/reseller/${router.query.resellerId}/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}#${stageSlug}`;

    const clickY = event?.clientY || 0;
    const scrollY = window.scrollY + clickY;

    const isMobile = typeof window !== "undefined" && window.innerWidth <= 768;

    window.parent.postMessage({ scrollToIframe: true }, "*");
  };

  // Load watermark image
  useEffect(() => {
    if (!resellerLogo) return;

    const img = new Image();
    img.src = resellerLogo;
    img.onload = () => {
      watermarkImageRef.current = img;
    };
  }, [resellerLogo]);

  // Fetch brands and models
  useEffect(() => {
    if (!resellerId) return;

    const fetchBrands = async () => {
      try {
        const res = await fetch(
          `/api/brands-with-overrides?resellerId=${encodeURIComponent(resellerId.toString())}`,
        );
        if (!res.ok) throw new Error("Failed to fetch brands");
        const json = await res.json();
        console.log("Fetched brands:", json.brands);
        setData(json.brands || []);
      } catch (error) {
        console.error("Error fetching brands:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrands();
  }, [resellerId]);

  // Fetch years
  useEffect(() => {
    if (!selected.brand || !selected.model || !resellerId) return;

    const fetchYears = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/years?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}&resellerId=${encodeURIComponent(resellerId.toString())}`,
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
    };

    fetchYears();
  }, [selected.brand, selected.model, resellerId]);

  // Fetch engines
  useEffect(() => {
    if (!selected.brand || !selected.model || !selected.year || !resellerId)
      return;

    const fetchEngines = async () => {
      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/engines?brand=${encodeURIComponent(selected.brand)}&model=${encodeURIComponent(selected.model)}&year=${encodeURIComponent(selected.year)}&resellerId=${encodeURIComponent(resellerId.toString())}`,
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
    };

    fetchEngines();
  }, [selected.brand, selected.model, selected.year, resellerId]);
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
    const models = data.find((b) => b.name === selected.brand)?.models || [];
    const years = models.find((m) => m.name === selected.model)?.years || [];
    const engines = years.find((y) => y.range === selected.year)?.engines || [];
    const selectedEngine = engines.find((e) => e.label === selected.engine);
    const stages = selectedEngine?.stages || [];

    const groupedEngines = engines.reduce(
      (acc, engine) => {
        const fuelType = engine.fuel;
        if (!acc[fuelType]) acc[fuelType] = [];
        acc[fuelType].push(engine);
        return acc;
      },
      {} as Record<string, typeof engines>,
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
        {} as Record<string, boolean>,
      );
      setExpandedStages(initialExpandedStates);
    }
  }, [stages]);

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
    [selectedEngine, aktPlusOptions],
  );

  const generateDynoCurve = (
    peakValue: number,
    isHp: boolean,
    fuelType: string,
  ) => {
    const rpmRange = fuelType.toLowerCase().includes("diesel")
      ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
      : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

    const peakIndex = isHp
      ? Math.floor(rpmRange.length * 0.6)
      : Math.floor(rpmRange.length * 0.4);
    const startIndex = 0;

    return rpmRange.map((rpm) => {
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

  const [expandedAktPlus, setExpandedAktPlus] = useState<
    Record<string, boolean>
  >({});

  const toggleAktPlus = (stageName: string) => {
    setExpandedAktPlus((prev) => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            {resellerLogo && (
              <img
                src={resellerLogo}
                alt="Reseller Logo"
                className="h-auto max-h-20 w-auto max-w-[500px] object-contain"
                loading="lazy"
                onClick={() => router.reload()}
              />
            )}
          </div>

          <LanguageSwitcher
            settings={settings}
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />
        </div>

        <div className="mb-4">
          <p className="text-black text-center text-lg font-semibold">
            {translate(currentLanguage, "headline")}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
          <div>
            <label className="block text-sm font-bold text-black mb-1">
              {translate(currentLanguage, "BrandValue")}
            </label>
            <select
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
            <label className="block text-sm font-bold text-black mb-1">
              {translate(currentLanguage, "ModelValue")}
            </label>
            <select
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
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-black mb-1">
              {translate(currentLanguage, "YearValue")}
            </label>
            <select
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
            <label className="block text-sm font-bold text-black mb-1">
              {translate(currentLanguage, "EngineValue")}
            </label>
            <select
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
          </div>
        ) : stages.length > 0 ? (
          <div className="space-y-6">
            {stages.map((stage) => {
              const isDsgStage = stage.name.toLowerCase().includes("dsg");
              const allOptions = getAllAktPlusOptions(stage);
              const isExpanded = expandedStages[stage.name] ?? false;
              const stageDesc = stageDescriptions.find(
                (d) => d.stageName === stage.name,
              );

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
                        {settings.displaySettings?.showBrandLogo &&
                          data.find((b) => b.name === selected.brand)?.logo
                            ?.asset && (
                            <img
                              src={urlFor(
                                data.find((b) => b.name === selected.brand)
                                  ?.logo,
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
                        {settings.displaySettings?.showStageLogo && (
                          <img
                            src={`/badges/${stage.name.toLowerCase().replace(/\s+/g, "")}.png`}
                            alt={stage.name}
                            className="h-8 object-contain"
                          />
                        )}
                        <span className="inline-block bg-red-600 text-black px-4 py-1 rounded-full text-xl font-semibold shadow-md">
                          <span>
                            {stage.price !== undefined
                              ? convertPrice(stage.price)
                              : "Pris saknas"}
                          </span>
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
                                stage.name,
                              )}{" "}
                              {translate(currentLanguage, "HKLABEL")}
                            </p>
                            <p className="text-xl font-bold">
                              {stage.tunedHk} HK
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
                          INFO
                        </button>
                        <button
                          onClick={() =>
                            setInfoModal({ open: true, type: "general" })
                          }
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                        >
                          💡 {translate(currentLanguage, "infoGeneral")}
                        </button>
                      </div>

                      <div className="mt-6">
                        {!isDsgStage && (
                          <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                            {translate(
                              currentLanguage,
                              "translateStageName",
                              stage.name,
                            ).toUpperCase()}
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
                                {translate(
                                  currentLanguage,
                                  "translateStageName",
                                  stage.name,
                                )
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
                                {translate(
                                  currentLanguage,
                                  "translateStageName",
                                  stage.name,
                                )
                                  .replace(/\s+/g, "")
                                  .toUpperCase()}{" "}
                                NM
                              </span>
                            </div>
                          </div>
                        )}

                        {!isDsgStage &&
                          settings.displaySettings?.showDynoChart && (
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
                                        selectedEngine.fuel,
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
                                        text: translate(
                                          currentLanguage,
                                          "powerLabel",
                                        ),
                                        color: "white",
                                        font: { size: 14 },
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
                                        callback: (value) => `${value}`,
                                      },
                                    },
                                    nm: {
                                      type: "linear",
                                      display: true,
                                      position: "right",
                                      title: {
                                        display: true,
                                        text: translate(
                                          currentLanguage,
                                          "torqueLabel",
                                        ),
                                        color: "white",
                                        font: { size: 14 },
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
                                {translate(currentLanguage, "tuningCurveNote")}
                              </div>
                            </div>
                          )}

                        {/* small tuned specs */}
                        {!isDsgStage && (
                          <div className="block text-center mt-6 mb-6">
                            <p className="text-sm text-white font-semibold">
                              {translate(currentLanguage, "tuningIntro")}
                              <span className="text-white-400 text-sm ml-1">
                                {translateStageName(
                                  currentLanguage,
                                  stage.name,
                                ).toUpperCase()}
                              </span>
                              {` - ${stage.tunedHk} HK & ${stage.tunedNm} NM`}
                            </p>
                          </div>
                        )}

                        {/* NOW start new block for the contact button */}

                        {/* KONTAKT button */}
                        <div className="mt-8 mb-10 flex flex-col items-center">
                          <button
                            onClick={() =>
                              setResellerContactModalData((prev) => ({
                                ...prev,
                                isOpen: true,
                                stageOrOption: stage.name, // or appropriate value
                              }))
                            }
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg flex items-center gap-2"
                          >
                            <span>📩</span>{" "}
                            {translate(currentLanguage, "contactvalue")}
                          </button>
                        </div>
                      </div>

                      {!isDsgStage &&
                        settings.displaySettings?.showAktPlus &&
                        allOptions.length > 0 && (
                          <div className="mt-8">
                            {/* AKT+ Toggle Button */}
                            <button
                              onClick={() => toggleAktPlus(stage.name)}
                              className="flex justify-between items-center w-full px-6 py-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <img
                                  src={
                                    settings.aktPlusLogo?.asset
                                      ? urlFor(settings.aktPlusLogo)
                                          .width(300)
                                          .quality(100)
                                          .url()
                                      : "/logos/aktplus.png"
                                  }
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
                                {allOptions.map((option) => {
                                  const override = aktPlusOptions.find(
                                    (o) => o.id === option._id,
                                  );

                                  const imageUrl =
                                    override?.imageUrl ||
                                    (option.gallery?.[0]?.asset &&
                                      urlFor(option.gallery[0].asset)
                                        .width(80)
                                        .url());

                                  const title = override?.title || option.title;
                                  const description =
                                    override?.description || option.description;
                                  const price = override?.price ?? option.price;

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
                                          {imageUrl && (
                                            <img
                                              src={imageUrl}
                                              alt={
                                                typeof title === "string"
                                                  ? title
                                                  : title?.[
                                                      settings.language
                                                    ] || "AKT+"
                                              }
                                              className="h-10 w-10 object-contain"
                                            />
                                          )}
                                          <span className="text-lg font-bold text-orange-600">
                                            {typeof title === "string"
                                              ? title
                                              : title?.[settings.language] ||
                                                "AKT+"}
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
                                          {description && (
                                            <div className="prose prose-invert max-w-none text-sm">
                                              <PortableText
                                                value={description}
                                                components={
                                                  portableTextComponents
                                                }
                                              />
                                            </div>
                                          )}

                                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                            {price !== undefined && (
                                              <p className="font-bold text-green-400">
                                                {translate(
                                                  currentLanguage,
                                                  "priceLabel",
                                                )}
                                                :
                                                <span>
                                                  {" "}
                                                  {convertPrice(price)}
                                                </span>
                                              </p>
                                            )}

                                            <button
                                              onClick={(onClose) =>
                                                setResellerContactModalData(
                                                  (prev) => ({
                                                    ...prev,
                                                    isOpen: true,
                                                    stageOrOption: stage.name, // or appropriate value
                                                  }),
                                                )
                                              }
                                              className="bg-green-600 hover:bg-green-700 hover:scale-105 transform transition-all text-white px-6 py-3 rounded-lg font-medium shadow-lg"
                                            >
                                              <span>📩</span>{" "}
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
                  )}
                </div>
              );
            })}
          </div>
        ) : null}

        {/* Modal */}
        <ResellerContactModal
          isOpen={ResellerContactModalData.isOpen}
          onClose={() =>
            setResellerContactModalData({
              isOpen: false,
              stageOrOption: "",
              link: "",
            })
          }
          vehicleInfo={{
            brand: selected.brand,
            model: selected.model,
            year: selected.year,
            engine: selected.engine,
          }}
          stageOrOption={ResellerContactModalData.stageOrOption}
          lang={settings.language}
        />

        <InfoModal
          isOpen={infoModal.open}
          onClose={() => setInfoModal({ open: false, type: "stage" })}
          title={
            infoModal.type === "stage"
              ? `${translate(settings.language, "stageInfoPrefix")} ${infoModal.stage?.name.replace(/\D/g, "")} ${translate(settings.language, "stageInfoSuffix")}`
              : translate(settings.language, "generalInfoLabel")
          }
          content={
            infoModal.type === "stage" ? (
              (() => {
                const description =
                  stageDescriptions.find(
                    (d) => d.stageName === infoModal.stage?.name,
                  )?.description ||
                  infoModal.stage?.descriptionRef?.description ||
                  infoModal.stage?.description;

                if (Array.isArray(description)) {
                  return (
                    <PortableText
                      value={description}
                      components={portableTextComponents}
                    />
                  );
                }

                return <p>{description}</p>;
              })()
            ) : (
              <PortableText
                value={generalInfo.content}
                components={portableTextComponents}
              />
            )
          }
          language={settings.language}
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
  language,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  language: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="bg-gray-900 p-6 rounded-lg shadow-lg max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-white text-xl">
            &times;
          </button>
        </div>
        <div className="text-gray-300 text-sm max-h-[70vh] overflow-y-auto">
          {content}
        </div>

        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            ❌ {translate(language, "closeButton")}
          </button>
        </div>
      </div>
    </div>
  );
};

const LanguageSwitcher = ({
  settings,
  currentLanguage,
  setCurrentLanguage,
}: {
  settings: ResellerSettings;
  currentLanguage: string;
  setCurrentLanguage: (lang: string) => void;
}) => {
  if (!settings.enableLanguageSwitcher || !settings.secondaryLanguage)
    return null;

  const nextLang =
    currentLanguage === settings.language
      ? settings.secondaryLanguage
      : settings.language;

  const langNames: Record<string, string> = {
    sv: "Svenska",
    en: "English",
    de: "Deutsch",
    fr: "Français",
    nl: "Nederlands",
    da: "Dansk",
    no: "Norsk",
    ar: "العربية",
    fi: "Suomi",
    es: "Español",
    it: "Italiano",
    pt: "Português",
    ru: "Русский",
    zh: "中文",
    ja: "日本語",
    ko: "한국어",
    pl: "Polski",
    tr: "Türkçe",
    hu: "Magyar",
    cs: "Čeština",
    uk: "Українська",
    th: "ไทย",
    ro: "Romanian",
  };

  const langFlags: Record<string, string> = {
    sv: "🇸🇪",
    en: "🇬🇧",
    de: "🇩🇪",
    fr: "🇫🇷",
    nl: "🇳🇱",
    da: "🇩🇰",
    no: "🇳🇴",
    ar: "🇸🇦",
    fi: "🇫🇮",
    es: "🇪🇸",
    it: "🇮🇹",
    pt: "🇵🇹",
    ru: "🇷🇺",
    zh: "🇨🇳",
    ja: "🇯🇵",
    ko: "🇰🇷",
    pl: "🇵🇱",
    tr: "🇹🇷",
    hu: "🇭🇺",
    cs: "🇨🇿",
    uk: "🇺🇦",
    th: "🇹🇭",
    ro: "🇷🇴",
  };

  return (
    <button
      onClick={() => setCurrentLanguage(nextLang)}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-md shadow-sm hover:bg-gray-700 transition"
      title={`Byt språk till ${langNames[nextLang] || nextLang.toUpperCase()}`}
    >
      <span className="text-xl">{langFlags[nextLang] || "🌐"}</span>
      <span className="font-medium">
        {`${translate(currentLanguage, "switchLanguage")} ${langNames[nextLang] || nextLang.toUpperCase()}`}
      </span>
    </button>
  );
};

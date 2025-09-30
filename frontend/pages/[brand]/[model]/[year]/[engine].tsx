// pages/[brand]/[model]/[year]/[engine].tsx
import {GetServerSideProps} from "next";
import NextImage from "next/image";
import Image from "next/image";
import {useRouter} from "next/router";
import Link from "next/link";
import client from "@/lib/sanity";
import {specificEngineQuery} from "@/src/lib/queries";
import type {
  Brand,
  Model,
  Year,
  Engine,
  Stage,
  AktPlusOption,
  AktPlusOptionReference,
} from "@/types/sanity";
import {urlFor} from "@/lib/sanity";
import {PortableText} from "@portabletext/react";
import PublicLanguageDropdown from "@/components/PublicLanguageSwitcher";
import {t as translate} from "@/lib/translations";
import Head from "next/head";
import React, {useEffect, useState, useRef, useMemo} from "react";
import ContactModal from "@/components/ContactModal";
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  Tooltip,
  Legend
);

const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-800 animate-pulse" />,
});
const FuelSavingCalculator = dynamic(
  () => import("@/components/FuelSavingCalculator"),
  {ssr: false}
);

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<
  EnginePageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  if (!brand || !model || !year || !engine) {
    return {notFound: true};
  }

  try {
    const lang =
      (typeof context.query.lang === "string" ? context.query.lang : null) ||
      "sv";

    const data = await client.fetch(specificEngineQuery, {
      brand,
      model,
      year,
      engine,
      lang,
    });

    const engineData = data?.model?.year?.engine;

    // Robust check to ensure the entire data chain exists
    if (!data || !data.model || !data.model.year || !engineData) {
      return {notFound: true};
    }

    // Now it's safe to reconstruct the data
    const yearData = {
      ...data.model.year,
      engines: [engineData],
    };

    const modelData = {
      ...data.model,
      years: [yearData],
    };

    const brandData = {
      ...data,
      models: [modelData],
    };

    return {
      props: {
        brandData,
        modelData,
        yearData,
        engineData,
      },
    };
  } catch (err) {
    console.error("Engine fetch failed:", err);
    return {notFound: true};
  }
};

function extractPlainTextFromDescription(description: any): string {
  if (!Array.isArray(description)) return "";

  return description
    .map(block => {
      if (block._type === "block" && Array.isArray(block.children)) {
        return block.children
          .map(child => (typeof child.text === "string" ? child.text : ""))
          .join("");
      }

      if (typeof block.text === "string") {
        return block.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

const portableTextComponents = {
  types: {
    image: ({value}: any) => (
      <img
        src={urlFor(value).width(600).url()}
        alt={value.alt || ""}
        className="my-4 rounded-lg shadow-md"
        loading="lazy"
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

const getStageColor = (stageName: string) => {
  const name = stageName.toLowerCase();
  if (name.includes("steg 1")) return "text-red-500";
  if (name.includes("steg 2")) return "text-orange-400";
  if (name.includes("steg 3")) return "text-purple-400";
  if (name.includes("steg 4")) return "text-yellow-400";
  if (name.includes("dsg")) return "text-blue-400";
  return "text-white";
};

export default function EnginePage({
  brandData,
  modelData,
  yearData,
  engineData,
}: EnginePageProps) {
  const cleanText = (str: string | null | undefined) => {
    if (!str) return "";
    return str
      .replace(/\.\.\./g, "")
      .replace(/\//g, "-")
      .replace(/\s+/g, " ")
      .trim();
  };
  const router = useRouter();
  const stageParam = router.query.stage;
  const stage = typeof stageParam === "string" ? stageParam : "";
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>(
    {}
  );

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

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }>({open: false, type: "stage"});

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

  const slugifySafe = (str: string) => {
    return str
      .toString()
      .toLowerCase()
      .trim()
      .replace(/->/g, "-")
      .replace(/>/g, "-")
      .replace(/\//g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-");
  };

  const slugifyYear = (range: string) => {
    return range
      .toLowerCase()
      .trim()
      .replace(/->/g, "-")
      .replace(/>/g, "-")
      .replace(/\//g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-");
  };

  const handleBookNow = (
    stageOrOptionName: string,
    event?: React.MouseEvent
  ) => {
    if (!brandData || !modelData || !yearData || !engineData) return;

    const brandSlug = brandData.slug?.current || slugify(brandData.name);
    const modelSlug =
      typeof modelData.slug === "object"
        ? modelData.slug.current
        : modelData.slug || slugify(modelData.name);
    const yearSlug = yearData.range.includes(" ")
      ? slugify(yearData.range)
      : yearData.range;
    const engineSlug = engineData.label.includes(" ")
      ? slugify(engineData.label)
      : engineData.label;

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
  };

  useEffect(() => {
    const storedLang = localStorage.getItem("lang");
    if (storedLang) {
      setCurrentLanguage(storedLang);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("lang", currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    const img = new window.Image();
    img.src = "/ak-logo.png";
    img.onload = () => {
      watermarkImageRef.current = img;
    };
  }, []);

  const [allAktOptions, setAllAktOptions] = useState<AktPlusOption[]>([]);
  useEffect(() => {
    if (engineData?.stages?.length) {
      const initialExpanded = engineData.stages.reduce(
        (acc, stageObj) => {
          const isMatch = slugify(stageObj.name) === slugify(stage || "");
          acc[stageObj.name] = stage ? isMatch : stageObj.name === "Steg 1";
          return acc;
        },
        {} as Record<string, boolean>
      );
      setExpandedStages(initialExpanded);
    }
  }, [engineData, stage]);

  const getAllAktPlusOptions = (stage: Stage): AktPlusOption[] => {
    if (!engineData) return [];

    const options = allAktOptions.filter(opt => {
      const isFuelMatch =
        opt.isUniversal || opt.applicableFuelTypes?.includes(engineData.fuel);

      const isManualMatch = opt.manualAssignments?.some(
        ref => ref._ref === engineData._id
      );

      const isStageMatch =
        !opt.stageCompatibility || opt.stageCompatibility === stage.name;

      return (isFuelMatch || isManualMatch) && isStageMatch;
    });

    const unique = new Map<string, AktPlusOption>();
    options.forEach(opt => unique.set(opt._id, opt));
    return Array.from(unique.values());
  };

  const mergedAktPlusOptions = useMemo(() => {
    const optionMap = new Map<string, AktPlusOption>();

    engineData?.stages?.forEach(stage => {
      getAllAktPlusOptions(stage).forEach(opt => {
        if (!optionMap.has(opt._id)) {
          optionMap.set(opt._id, opt);
        }
      });
    });

    return Array.from(optionMap.values());
  }, [engineData, allAktOptions]);

  useEffect(() => {
    const fetchAktPlusOptions = async () => {
      try {
        const res = await fetch(`/api/aktplus-options?lang=${currentLanguage}`);
        const json = await res.json();
        setAllAktOptions(json.options || []);
      } catch (err) {
        console.error("Kunde inte hämta AKT+ alternativ", err);
      }
    };

    fetchAktPlusOptions();
  }, [currentLanguage]);

  useEffect(() => {
    if (stage) {
      const el = document.getElementById(slugify(stage));
      if (el) el.scrollIntoView({behavior: "smooth", block: "start"});
    }
  }, [stage]);

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

  const translateStageName = (lang: string, name: string): string => {
    const match = name.match(/Steg\s?(\d+)/i);
    if (!match) return name;

    const stageNum = match[1];
    const translations: Record<string, string> = {
      sv: `Steg ${stageNum}`,
      en: `Stage ${stageNum}`,
      it: `Fase ${stageNum}`,
      de: `Stufe ${stageNum}`,
      fr: `Niveau ${stageNum}`,
      da: `Stadie ${stageNum}`,
      no: `Trinn ${stageNum}`,
    };

    return translations[lang] || name;
  };

  const [expandedAktPlus, setExpandedAktPlus] = useState<
    Record<string, boolean>
  >({});

  const toggleAktPlus = (stageName: string) => {
    setExpandedAktPlus(prev => ({
      ...prev,
      [stageName]: !prev[stageName],
    }));
  };

  const rpmLabels = useMemo(() => {
    return engineData?.fuel?.toLowerCase().includes("diesel")
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
  }, [engineData?.fuel]);

  const selectedStage = engineData?.stages?.find(s => expandedStages[s.name]);
  const selectedStep = selectedStage?.name?.toUpperCase() || "MJUKVARA";
  const hp = selectedStage?.tunedHk ?? "?";
  const nm = selectedStage?.tunedNm ?? "?";

  const hkIncrease =
    typeof selectedStage?.tunedHk === "number" &&
    typeof selectedStage?.origHk === "number"
      ? selectedStage.tunedHk - selectedStage.origHk
      : "?";

  const nmIncrease =
    typeof selectedStage?.tunedNm === "number" &&
    typeof selectedStage?.origNm === "number"
      ? selectedStage.tunedNm - selectedStage.origNm
      : "?";

  const price =
    selectedStage?.price != null
      ? `${selectedStage.price.toLocaleString()} kr`
      : "";

  const brandSlug = brandData?.slug?.current || slugify(brandData?.name || "");
  const modelSlug =
    typeof modelData?.slug === "object"
      ? modelData.slug.current
      : modelData?.slug || slugify(modelData?.name || "");
  const yearSlug = yearData?.range.includes(" ")
    ? slugify(yearData.range)
    : yearData?.range || "";
  const engineSlug = engineData?.label.includes(" ")
    ? slugify(engineData.label)
    : engineData?.label || "";

  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;

  const pageTitle = cleanText(
    `Motoroptimering ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range} – ${selectedStep}`
  );
  const hkIncreaseText =
    hkIncrease !== "?" ? `+${hkIncrease} hk` : "högre effekt";
  const nmIncreaseText =
    nmIncrease !== "?" ? `+${nmIncrease} Nm` : "bättre vridmoment";

  const pageDescription = cleanText(
    `Motoroptimering till ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range} ${hkIncreaseText} & ${nmIncreaseText} med skräddarsydd ${selectedStep} mjukvara. 2 års garanti & 30 dagars öppet köp!`
  );
  const pageUrl = `https://tuning.aktuning.se${router.asPath.split("?")[0]}`;

  const imageUrl = "https://tuning.aktuning.se/ak-logo1.png";

  if (!engineData || !brandData || !modelData || !yearData) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine}
        </h1>
        <p className="text-lg text-red-500">Motorinformation saknas.</p>
      </div>
    );
  }

  function renderDescription(
    template: string,
    data: Record<string, string | number>
  ): string {
    return template.replace(/{{(.*?)}}/g, (_, key) => {
      return data[key.trim()]?.toString() || "";
    });
  }

  const createDynamicDescription = (
    description: any[],
    stage: Stage | undefined
  ) => {
    if (
      !brandData ||
      !modelData ||
      !engineData ||
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
              .replace(/{{brand}}/g, brandData.name)
              .replace(/{{model}}/g, modelData.name)
              .replace(/{{year}}/g, yearData?.range || "")
              .replace(/{{engine}}/g, engineData.label)
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
      <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
        <div className="flex items-center justify-between mb-4">
          <NextImage
            src="/ak-logo2.png"
            alt="AK-TUNING MOTOROPTIMERING"
            width={110}
            height={120}
            className="h-full object-contain cursor-pointer hover:opacity-90"
            onClick={() => (window.location.href = "/")}
            priority
          />
          <PublicLanguageDropdown
            currentLanguage={currentLanguage}
            setCurrentLanguage={setCurrentLanguage}
          />
        </div>
        <div className="mb-8 text-center">
          {!engineData ? (
            <h1 className="text-xl sm:text-3xl md:text-xl font-bold">
              {translate(currentLanguage, "tuningIntro")}
            </h1>
          ) : (
            <div>
              <h1 className="text-xl sm:text-3xl md:text-xl font-bold mb-2">
                {translate(currentLanguage, "tuningIntro")}{" "}
                {cleanText((brandData.name, modelData.name))}{" "}
                {cleanText(yearData.range)} – {cleanText(engineData.label)}
              </h1>
              <Link
                href={`/${slugifySafe(
                  brandData.slug?.current || brandData.name
                )}/${slugifySafe(
                  modelData.slug?.current || modelData.name
                )}/${slugifyYear(yearData.range)}`}
                className="text-sm text-orange-500 hover:underline"
              >
                ← {translate(currentLanguage, "BACKTO")} {yearData.range}
              </Link>
            </div>
          )}
        </div>
        {engineData.stages?.length > 0 ? (
          <div className="space-y-6">
            {engineData.stages.map(stage => {
              const isExpanded = expandedStages[stage.name] ?? false;

              return (
                <div
                  id={slugify(stage.name)}
                  key={stage.name}
                  className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden"
                >
                  <button
                    onClick={() => toggleStage(stage.name)}
                    className="w-full p-6 text-left hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div className="flex items-center gap-4">
                        {brandData.logo?.asset && (
                          <Image
                            src={urlFor(brandData.logo).width(60).url()}
                            alt={brandData.name}
                            width={60}
                            height={35}
                            className="h-8 w-auto object-contain"
                            loading="lazy"
                          />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                          {engineData.label} -{" "}
                          <span
                            className={`uppercase tracking-wide ${getStageColor(
                              stage.name
                            )}`}
                          >
                            [{translateStageName(currentLanguage, stage.name)}]
                          </span>
                        </h2>
                      </div>

                      <div className="mt-3 md:mt-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-center">
                        <Image
                          src={`/badges/${stage.name
                            .toLowerCase()
                            .replace(/\s+/g, "")}.png`}
                          alt={`${brandData.name} ${modelData.name} ${engineData.label} – ${stage.name}`}
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

                  {isExpanded &&
                    (() => {
                      const isDsgStage = stage.name
                        .toLowerCase()
                        .includes("dsg");
                      const isTruck = brandData.name.startsWith("[LASTBIL]");
                      const allOptions = getAllAktPlusOptions(stage);
                      const hkIncrease =
                        stage.tunedHk && stage.origHk
                          ? stage.tunedHk - stage.origHk
                          : "?";
                      const nmIncrease =
                        stage.tunedNm && stage.origNm
                          ? stage.tunedNm - stage.origNm
                          : "?";

                      const descriptionObject =
                        stage.descriptionRef?.description || stage.description;
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

                      const dynamicDescription = rawDescription
                        ? createDynamicDescription(rawDescription, stage)
                        : null;

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
                                      {translate(
                                        currentLanguage,
                                        "launchControl"
                                      )}
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
                                      {translate(currentLanguage, "rpmLimit")}
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
                                      {translate(currentLanguage, "shiftTime")}
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
                                  stage.name
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
                                  setInfoModal({
                                    open: true,
                                    type: "general",
                                  })
                                }
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                              >
                                💡 {translate(currentLanguage, "infoGeneral")}
                              </button>
                            </div>
                            {/* Hidden SEO content for general info */}

                            <div className="mt-6">
                              {!isDsgStage && !isTruck && (
                                <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                                  {translate(
                                    currentLanguage,
                                    "translateStageName",
                                    stage.name
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

                                  <div className="text-center text-white text-xs mt-4 italic">
                                    {translate(
                                      currentLanguage,
                                      "tuningCurveNote"
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
                                        "tuningIntro"
                                      )}{" "}
                                      <span
                                        className={getStageColor(stage.name)}
                                      >
                                        {stage.name
                                          .replace(
                                            "Steg",
                                            translate(
                                              currentLanguage,
                                              "stageLabel"
                                            )
                                          )
                                          .toUpperCase()}
                                      </span>
                                    </p>
                                    <p className="text-gray-300 mt-1">
                                      {stage.tunedHk} HK (+{hkIncrease}) &{" "}
                                      {stage.tunedNm} NM (+{nmIncrease})
                                    </p>
                                  </div>

                                  {/* Action Buttons Grid */}
                                  <div className="flex flex-col gap-4 max-w-2xl mx-auto">
                                    {/* Contact Button (Primary) - Now Green */}
                                    <button
                                      onClick={e =>
                                        handleBookNow(stage.name, e)
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
                                        "additionsLabel"
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
                                            onClick={() =>
                                              toggleOption(option._id)
                                            }
                                            className="w-full flex justify-between items-center p-4 hover:bg-gray-600 transition-colors"
                                          >
                                            <div className="flex items-center gap-3">
                                              {option.gallery?.[0]?.asset && (
                                                <Image
                                                  src={urlFor(
                                                    option.gallery[0].asset
                                                  )
                                                    .width(80)
                                                    .url()}
                                                  alt={`${brandData.name} ${modelData.name} ${engineData.label} – ${translatedTitle}`}
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
                                                      "priceLabel"
                                                    )}
                                                    :{" "}
                                                    {option.price.toLocaleString()}{" "}
                                                    kr
                                                  </p>
                                                )}

                                                <button
                                                  onClick={() =>
                                                    handleBookNow(
                                                      translatedTitle
                                                    )
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
                        </>
                      );
                    })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-gray-300">
              Ingen steginformation tillgänglig för denna motor.
            </p>
          </div>
        )}
        <ContactModal
          isOpen={contactModalData.isOpen}
          onClose={() =>
            setContactModalData({isOpen: false, stageOrOption: "", link: ""})
          }
          selectedVehicle={{
            brand: brandData.name,
            model: modelData.name,
            year: yearData.range,
            engine: engineData.label,
          }}
          stageOrOption={contactModalData.stageOrOption}
          link={contactModalData.link}
          scrollPosition={contactModalData.scrollPosition}
        />
      </div>
    </>
  );
}

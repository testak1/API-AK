// pages/[brand]/[model]/[year]/[engine]/[stage].tsx
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

interface StagePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
  stageData: Stage | null;
}

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<
  StagePageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");
  const stage = decodeURIComponent((context.params?.stage as string) || "");

  if (!brand || !model || !year || !engine || !stage) {
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
    if (!engineData) {
      return {notFound: true};
    }

    const stageData =
      engineData.stages?.find(
        (s: Stage) =>
          normalizeString(s.name) === normalizeString(stage) ||
          normalizeString(s.name.replace(/\s+/g, "-")) ===
            normalizeString(stage)
      ) || null;

    if (!stageData) {
      return {notFound: true};
    }

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
        stageData,
      },
    };
  } catch (err) {
    console.error("Stage page fetch failed:", err);
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

export default function StagePage({
  brandData,
  modelData,
  yearData,
  engineData,
  stageData,
}: StagePageProps) {
  const cleanText = (str: string | null | undefined) => {
    if (!str) return "";
    return str
      .replace(/\.\.\./g, "")
      .replace(/\//g, "-")
      .replace(/\s+/g, " ")
      .trim();
  };

  const router = useRouter();
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

  const [expandedOptions, setExpandedOptions] = useState<
    Record<string, boolean>
  >({});
  const [allAktOptions, setAllAktOptions] = useState<AktPlusOption[]>([]);
  const [expandedAktPlus, setExpandedAktPlus] = useState(false);

  const slugify = (str: string) =>
    str
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

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

    const finalLink = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;

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
      sv: `STEG ${stageNum}`,
      en: `Stage ${stageNum}`,
      it: `Fase ${stageNum}`,
      de: `Stufe ${stageNum}`,
      fr: `Niveau ${stageNum}`,
      da: `Stadie ${stageNum}`,
      no: `Trinn ${stageNum}`,
    };

    return translations[lang] || name;
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

  const allOptions = stageData ? getAllAktPlusOptions(stageData) : [];
  const hkIncrease =
    stageData?.tunedHk && stageData?.origHk
      ? stageData.tunedHk - stageData.origHk
      : "?";
  const nmIncrease =
    stageData?.tunedNm && stageData?.origNm
      ? stageData.tunedNm - stageData.origNm
      : "?";

  const price =
    stageData?.price != null ? `${stageData.price.toLocaleString()} kr` : "";

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
  const stageSlug = stageData?.name
    ? slugify(stageData.name.replace(/\s+/g, "-"))
    : "";

  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}/${stageSlug}`;
  const enginePageUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;

  const pageTitle = cleanText(
    `Motoroptimering ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range} – ${stageData?.name} | AK-TUNING`
  );

  const hkIncreaseText =
    hkIncrease !== "?" ? `+${hkIncrease} hk` : "högre effekt";
  const nmIncreaseText =
    nmIncrease !== "?" ? `+${nmIncrease} Nm` : "bättre vridmoment";

  const pageDescription = cleanText(
    `${stageData?.name} Motoroptimering för ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range}. Effekt: ${stageData?.tunedHk} hk (${hkIncreaseText}). Vridmoment: ${stageData?.tunedNm} Nm (${nmIncreaseText}). Skräddarsydd mjukvara med 2 års garanti & 30 dagars öppet köp!`
  );

  const imageUrl = "https://tuning.aktuning.se/ak-logo1.png";

  if (!engineData || !brandData || !modelData || !yearData || !stageData) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine} / {router.query.stage}
        </h1>
        <p className="text-lg text-red-500">Stage information saknas.</p>
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

  const isDsgStage = stageData.name.toLowerCase().includes("dsg");
  const isTruck = brandData.name.startsWith("[LASTBIL]");
  const descriptionObject =
    stageData.descriptionRef?.description || stageData.description;
  let rawDescription = null;

  if (descriptionObject) {
    if (
      typeof descriptionObject === "object" &&
      !Array.isArray(descriptionObject)
    ) {
      rawDescription =
        descriptionObject[currentLanguage] || descriptionObject["sv"] || [];
    } else if (Array.isArray(descriptionObject)) {
      rawDescription = descriptionObject;
    }
  }

  const dynamicDescription = rawDescription
    ? createDynamicDescription(rawDescription, stageData)
    : null;

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
          <div>
            <h1 className="text-xl sm:text-3xl md:text-xl font-bold mb-2">
              {translate(currentLanguage, "tuningIntro")}{" "}
              {cleanText(brandData.name)}{" "}
              {cleanText((brandData.name, modelData.name))}{" "}
              {cleanText(yearData.range)} {cleanText(engineData.label)} –{" "}
              <span className={getStageColor(stageData.name)}>
                {cleanText(stageData.name.toUpperCase())}
              </span>
            </h1>
            <Link
              href={enginePageUrl}
              className="text-sm text-orange-500 hover:underline"
            >
              ← {translate(currentLanguage, "BACKTO")} {engineData.label}
            </Link>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="w-full p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                {brandData.logo?.asset && (
                  <Image
                    src={urlFor(brandData.logo).width(60).url()}
                    alt={`${brandData.name} logo`}
                    width={60}
                    height={35}
                    className="h-8 w-auto object-contain"
                    loading="lazy"
                  />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {engineData.label} -{" "}
                  <span
                    className={`uppercase tracking-wide ${getStageColor(stageData.name)}`}
                  >
                    [{translateStageName(currentLanguage, stageData.name)}]
                  </span>
                </h2>
              </div>

              <div className="mt-3 md:mt-0 flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-4 text-center">
                <Image
                  src={`/badges/${stageData.name.toLowerCase().replace(/\s+/g, "")}.png`}
                  alt={`${brandData.name} ${modelData.name} ${engineData.label} – ${stageData.name}`}
                  width={66}
                  height={32}
                  className="h-8 object-contain"
                  loading="lazy"
                />

                <span className="inline-block bg-red-600 text-black px-4 py-1 rounded-full text-xl font-semibold shadow-md">
                  {stageData.price?.toLocaleString()} kr
                </span>
                {(stageData.name.includes("Steg 2") ||
                  stageData.name.includes("Steg 3") ||
                  stageData.name.includes("Steg 4")) && (
                  <p className="text-xs text-gray-400 mt-2 italic">
                    {translate(currentLanguage, "stageSoftwareOnly")}
                    <br />
                    {translate(currentLanguage, "stageContactForHardware")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="px-6 pb-6">
            {isTruck && <FuelSavingCalculator stage={stageData} />}

            {isDsgStage ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-6">
                {stageData.tcuFields?.launchControl && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "launchControl")}
                    </p>
                    <p>
                      Original:{" "}
                      {stageData.tcuFields.launchControl.original || "-"} RPM
                    </p>
                    <p>
                      Optimerad:{" "}
                      <span className="text-green-400">
                        {stageData.tcuFields.launchControl.optimized || "-"} RPM
                      </span>
                    </p>
                  </div>
                )}
                {stageData.tcuFields?.rpmLimit && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "rpmLimit")}
                    </p>
                    <p>
                      Original: {stageData.tcuFields.rpmLimit.original || "-"}{" "}
                      RPM
                    </p>
                    <p>
                      Optimerad:{" "}
                      <span className="text-green-400">
                        {stageData.tcuFields.rpmLimit.optimized || "-"} RPM
                      </span>
                    </p>
                  </div>
                )}
                {stageData.tcuFields?.shiftTime && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "shiftTime")}
                    </p>
                    <p>
                      Original: {stageData.tcuFields.shiftTime.original || "-"}{" "}
                      ms
                    </p>
                    <p>
                      Optimerad:{" "}
                      <span className="text-green-400">
                        {stageData.tcuFields.shiftTime.optimized || "-"} ms
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
                    {stageData.origHk} hk
                  </p>
                </div>
                <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                  <p className="text-xl text-white font-bold mb-1 uppercase">
                    {translateStageName(currentLanguage, stageData.name)} HK
                  </p>
                  <p className="text-xl font-bold">{stageData.tunedHk} hk</p>
                  <p className="text-xs mt-1 text-red-400">
                    +{stageData.tunedHk - stageData.origHk} hk
                  </p>
                </div>
                <div className="border border-white rounded-lg p-3 text-center">
                  <p className="text-sm text-white font-bold mb-1">
                    {translate(currentLanguage, "originalNm")}
                  </p>
                  <p className="text-xl text-white font-bold">
                    {stageData.origNm} Nm
                  </p>
                </div>
                <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                  <p className="text-xl text-white font-bold mb-1 uppercase">
                    {translateStageName(currentLanguage, stageData.name)} NM
                  </p>
                  <p className="text-xl font-bold">{stageData.tunedNm} Nm</p>
                  <p className="text-xs mt-1 text-red-400">
                    +{stageData.tunedNm - stageData.origNm} Nm
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
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
                        ORG: {stageData.origHk} HK
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-red-600 font-mono text-[16px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                        ━━━
                      </span>
                      <span className="text-white">
                        <span className="text-white text-[14px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                          {stageData.name
                            .replace("Steg", "ST")
                            .replace(/\s+/g, "")}
                          : {stageData.tunedHk} HK
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
                        ORG: {stageData.origNm} NM
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono text-[16px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                        ━━━
                      </span>
                      <span className="text-white">
                        <span className="text-white text-[14px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                          {stageData.name
                            .replace("Steg", "ST")
                            .replace(/\s+/g, "")}
                          : {stageData.tunedNm} NM
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-center text-white text-xs mt-4 italic">
                  {translate(currentLanguage, "tuningCurveNote")}
                </div>
              </div>
            </div>

            {dynamicDescription && dynamicDescription.length > 0 && (
              <div className="mb-6">
                <div className="bg-gray-900 rounded-lg p-4">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {cleanText(stageData.name.toUpperCase())} -{" "}
                    {translate(currentLanguage, "tuningIntro").toUpperCase()}{" "}
                    {translate(currentLanguage, "info1").toUpperCase()}
                  </h3>
                  <div className="prose prose-invert max-w-none text-white">
                    <PortableText
                      value={dynamicDescription}
                      components={portableTextComponents}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-center items-center mb-4">
              <button
                onClick={e => handleBookNow(stageData.name, e)}
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-lg font-bold text-lg shadow-lg transition-all duration-300 transform hover:scale-105 w-full sm:w-auto text-center"
              >
                📩 {translate(currentLanguage, "contactvalue")}{" "}
                {stageData.name.toUpperCase()}
              </button>
            </div>
            {allOptions.length > 0 && (
              <div className="mb-6">
                <div className="bg-gray-900 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Image
                        src="/logos/aktplus.png"
                        alt="AKT+ Logo"
                        width={120}
                        height={32}
                        className="h-8 w-auto object-contain"
                        loading="lazy"
                      />
                      <h3 className="text-xl font-bold text-white">
                        {translate(currentLanguage, "additionsLabel")}
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allOptions
                      .slice(0, expandedAktPlus ? allOptions.length : 6)
                      .map(option => {
                        const isExpanded = expandedOptions[option._id] || false;
                        // KORRIGERAD RAD - ta bort option.name
                        const optionTitle =
                          option.title?.[currentLanguage] ||
                          option.title?.sv ||
                          "";
                        const optionDescription =
                          option.description?.[currentLanguage] ||
                          option.description?.["sv"] ||
                          [];

                        return (
                          <div
                            key={option._id}
                            className={`border rounded-lg p-4 transition-all duration-300 ${
                              isExpanded
                                ? "border-orange-400 bg-gray-800"
                                : "border-gray-600 bg-gray-700"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex-1">
                                <h4 className="font-semibold text-white text-lg mb-1">
                                  {optionTitle}
                                </h4>
                                {option.price && (
                                  <p className="text-orange-400 font-bold text-lg mb-2">
                                    {translate(currentLanguage, "priceLabel")}:{" "}
                                    {option.price.toLocaleString()} kr
                                  </p>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <button
                                  onClick={() => toggleOption(option._id)}
                                  className="text-orange-400 hover:text-orange-300 text-sm font-medium whitespace-nowrap"
                                >
                                  {isExpanded ? "Dölj info" : "Visa info"}
                                </button>
                                <button
                                  onClick={e =>
                                    handleBookNow(
                                      `${stageData.name} + ${optionTitle}`,
                                      e
                                    )
                                  }
                                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm font-medium whitespace-nowrap"
                                >
                                  📩{" "}
                                  {translate(currentLanguage, "contactvalue")}
                                </button>
                              </div>
                            </div>

                            {isExpanded && (
                              <div className="mt-3 pt-3 border-t border-gray-600">
                                {optionDescription.length > 0 ? (
                                  <div className="prose prose-invert max-w-none text-sm text-gray-200">
                                    <PortableText
                                      value={optionDescription}
                                      components={portableTextComponents}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-gray-400 text-sm italic">
                                    Ingen beskrivning tillgänglig
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {infoModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 border border-gray-600">
            <h3 className="text-xl font-bold text-white mb-4">
              {infoModal.type === "stage"
                ? translate(currentLanguage, "infoStage")
                : translate(currentLanguage, "infoGeneral")}
            </h3>
            <div className="text-gray-200 mb-6">
              {infoModal.type === "stage" && infoModal.stage ? (
                <div>
                  <p className="mb-2">
                    <strong>{translate(currentLanguage, "stage")}:</strong>{" "}
                    {infoModal.stage.name}
                  </p>
                  <p className="mb-2">
                    <strong>{translate(currentLanguage, "price")}:</strong>{" "}
                    {infoModal.stage.price?.toLocaleString()} kr
                  </p>
                  <p>
                    <strong>
                      {translate(currentLanguage, "performance")}:
                    </strong>{" "}
                    {infoModal.stage.origHk} → {infoModal.stage.tunedHk} hk (+
                    {hkIncrease}) / {infoModal.stage.origNm} →{" "}
                    {infoModal.stage.tunedNm} Nm (+{nmIncrease})
                  </p>
                </div>
              ) : (
                <p>{translate(currentLanguage, "generalInfoText")}</p>
              )}
            </div>
            <button
              onClick={() => setInfoModal({open: false, type: "stage"})}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded w-full"
            >
              {translate(currentLanguage, "close")}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// pages/[brand]/[model]/[year]/[engine]/[stage].tsx
import { GetStaticPaths, GetStaticProps } from "next";
import NextImage from "next/image";
import Image from "next/image";
import { useRouter } from "next/router";
import Link from "next/link";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import type {
  Brand,
  Model,
  Year,
  Engine,
  Stage,
  AktPlusOption,
} from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import { PortableText } from "@portabletext/react";
import PublicLanguageDropdown from "@/components/PublicLanguageSwitcher";
import { t as translate } from "@/lib/translations";
import Head from "next/head";
import React, { useEffect, useState, useRef, useMemo } from "react";
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
  Legend,
);

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: () => <div className="h-96 bg-gray-800 animate-pulse" />,
});
const FuelSavingCalculator = dynamic(
  () => import("@/components/FuelSavingCalculator"),
  { ssr: false },
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

export const getStaticPaths: GetStaticPaths = async () => {
  // Return empty paths for static generation at build time
  // Next.js will generate paths on-demand
  return {
    paths: [],
    fallback: 'blocking',
  };
};

export const getStaticProps: GetStaticProps<StagePageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");
  const stage = decodeURIComponent((context.params?.stage as string) || "");

  try {
    const lang = "sv"; 
    
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
      lang,
    });

    if (!brandData) return { notFound: true };

    const modelData =
      brandData.models?.find(
        (m: Model) =>
          normalizeString(m.name) === normalizeString(model) ||
          (m.slug &&
            normalizeString(
              typeof m.slug === "string" ? m.slug : m.slug.current,
            ) === normalizeString(model)),
      ) || null;

    if (!modelData) return { notFound: true };

    const yearData =
      modelData.years?.find(
        (y: Year) =>
          normalizeString(y.range) === normalizeString(year) ||
          (y.slug && normalizeString(y.slug) === normalizeString(year)),
      ) || null;

    if (!yearData) return { notFound: true };

    const engineData =
      yearData.engines?.find(
        (e: Engine) =>
          normalizeString(e.label) === normalizeString(engine) ||
          (e.slug && normalizeString(e.slug) === normalizeString(engine)),
      ) || null;

    if (!engineData) return { notFound: true };

    const stageData =
      engineData.stages?.find(
        (s: Stage) =>
          normalizeString(s.name) === normalizeString(stage) ||
          (s.slug && normalizeString(s.slug) === normalizeString(stage)),
      ) || null;

    if (!stageData) return { notFound: true };

    return {
      props: {
        brandData,
        modelData,
        yearData,
        engineData,
        stageData,
      },
      revalidate: 86400, // Revalidate daily
    };
  } catch (err) {
    console.error("Stage fetch failed:", err);
    return { notFound: true };
  }
};

function extractPlainTextFromDescription(description: any): string {
  if (!Array.isArray(description)) return "";

  return description
    .map((block) => {
      if (block._type === "block" && Array.isArray(block.children)) {
        return block.children
          .map((child) => (typeof child.text === "string" ? child.text : ""))
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
    image: ({ value }: any) => (
      <img
        src={urlFor(value).width(600).url()}
        alt={value.alt || ""}
        className="my-4 rounded-lg shadow-md"
        loading="lazy"
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

const generateDynoCurve = (
  peakValue: number,
  isHp: boolean,
  fuelType: string,
) => {
  const isDiesel = fuelType.toLowerCase().includes("diesel");
  const rpmRange = isDiesel
    ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
    : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

  const totalSteps = rpmRange.length;
  const addRandomVariation = (value: number) => {
    const variation = Math.random() * 0.06 - 0.03;
    return value * (1 + variation);
  };

  if (isHp) {
    const startPercentage = isDiesel ? 0.45 : 0.35;
    const peakStepPercentage = isDiesel ? 0.6 : 0.7;
    const peakStep = Math.floor(totalSteps * peakStepPercentage);

    return rpmRange.map((rpm, i) => {
      let value: number;
      if (i <= peakStep) {
        const progress = i / peakStep;
        const curveFactor = isDiesel ? Math.pow(progress, 0.9) : progress;
        value =
          peakValue * (startPercentage + (1 - startPercentage) * curveFactor);
      } else {
        const progress = (i - peakStep) / (totalSteps - 1 - peakStep);
        const dropRate = isDiesel ? 0.15 : 0.25;
        value = peakValue * (1 - dropRate * Math.pow(progress, 1.2));
      }
      return addRandomVariation(value);
    });
  } else {
    const startPercentage = isDiesel ? 0.6 : 0.4;
    const peakStepPercentage = isDiesel ? 0.3 : 0.4;
    const plateauLength = isDiesel ? 3 : 2;
    const peakStep = Math.floor(totalSteps * peakStepPercentage);
    const plateauEndStep = Math.min(peakStep + plateauLength, totalSteps - 1);

    return rpmRange.map((rpm, i) => {
      let value: number;
      if (i < peakStep) {
        const progress = i / peakStep;
        value =
          peakValue *
          (startPercentage + (1 - startPercentage) * Math.pow(progress, 1.3));
      } else if (i <= plateauEndStep) {
        const plateauProgress = (i - peakStep) / (plateauEndStep - peakStep);
        const plateauVariation = Math.sin(plateauProgress * Math.PI) * 0.02;
        value = peakValue * (0.98 + plateauVariation);
      } else {
        const progress =
          (i - plateauEndStep) / (totalSteps - 1 - plateauEndStep);
        const dropRate = isDiesel ? 0.2 : 0.3;
        value = peakValue * (1 - dropRate * Math.pow(progress, 1.1));
      }
      return addRandomVariation(value);
    });
  }
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
  }>({ open: false, type: "stage" });

  const [expandedOptions, setExpandedOptions] = useState<
    Record<string, boolean>
  >({});
  const [expandedAktPlus, setExpandedAktPlus] = useState(false);
  const [allAktOptions, setAllAktOptions] = useState<AktPlusOption[]>([]);

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
    event?: React.MouseEvent,
  ) => {
    if (!brandData || !modelData || !yearData || !engineData || !stageData) return;

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

    const finalLink = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}/${slugify(stageData.name)}`;

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

  const getAllAktPlusOptions = (stage: Stage): AktPlusOption[] => {
    if (!engineData) return [];

    const options = allAktOptions.filter((opt) => {
      const isFuelMatch =
        opt.isUniversal || opt.applicableFuelTypes?.includes(engineData.fuel);

      const isManualMatch = opt.manualAssignments?.some(
        (ref) => ref._ref === engineData._id,
      );

      const isStageMatch =
        !opt.stageCompatibility || opt.stageCompatibility === stage.name;

      return (isFuelMatch || isManualMatch) && isStageMatch;
    });

    const unique = new Map<string, AktPlusOption>();
    options.forEach((opt) => unique.set(opt._id, opt));
    return Array.from(unique.values());
  };

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

  const formatModelName = (brand: string, model: string): string => {
    const mercedesModels = [
      "A", "B", "C", "CL", "CLA", "CLC", "CLK", "CLS", "E", "G", "GL", "GLA", 
      "GLB", "GLC", "GLE", "GLK", "GLS", "GT", "ML", "R", "S", "SL", "SLC", 
      "SLK", "SLS", "V", "X",
    ];
    if (
      brand.toLowerCase().includes("mercedes") &&
      mercedesModels.includes(model.toUpperCase())
    ) {
      return `${model}-klass`;
    }
    return model;
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

  const toggleOption = (optionId: string) => {
    setExpandedOptions((prev) => ({
      ...prev,
      [optionId]: !prev[optionId],
    }));
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

  const rpmLabels = useMemo(() => {
    return engineData?.fuel?.toLowerCase().includes("diesel")
      ? ["1500", "2000", "2500", "3000", "3500", "4000", "4500", "5000"]
      : [
          "2000", "2500", "3000", "3500", "4000", "4500", 
          "5000", "5500", "6000", "6500", "7000",
        ];
  }, [engineData?.fuel]);

  if (!engineData || !brandData || !modelData || !yearData || !stageData) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year} /{" "}
          {router.query.engine} / {router.query.stage}
        </h1>
        <p className="text-lg text-red-500">Steginformation saknas.</p>
      </div>
    );
  }

  const isDsgStage = stageData.name.toLowerCase().includes("dsg");
  const isTruck = brandData.name.startsWith("[LASTBIL]");
  const allOptions = getAllAktPlusOptions(stageData);
  const hkIncrease =
    stageData.tunedHk && stageData.origHk
      ? stageData.tunedHk - stageData.origHk
      : "?";
  const nmIncrease =
    stageData.tunedNm && stageData.origNm
      ? stageData.tunedNm - stageData.origNm
      : "?";

  const descriptionObject =
    stageData.descriptionRef?.description || stageData.description;
  let rawDescription = null;

  if (Array.isArray(descriptionObject)) {
    rawDescription = descriptionObject;
  } else if (typeof descriptionObject === "object" && descriptionObject !== null) {
    rawDescription =
      descriptionObject[currentLanguage] || descriptionObject["sv"] || [];
  }

  const createDynamicDescription = (description: any[], stage: Stage) => {
    if (!brandData || !modelData || !engineData || !stage || !Array.isArray(description)) {
      return description;
    }

    const hkIncrease = stage.tunedHk && stage.origHk ? stage.tunedHk - stage.origHk : "?";
    const nmIncrease = stage.tunedNm && stage.origNm ? stage.tunedNm - stage.origNm : "?";

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

  const dynamicDescription = rawDescription
    ? createDynamicDescription(rawDescription, stageData)
    : null;

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
  const stageSlug = slugify(stageData.name);

  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}/${stageSlug}`;

  const pageTitle = cleanText(
    `Motoroptimering ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range} – ${stageData.name.toUpperCase()}`,
  );

  const hkIncreaseText = hkIncrease !== "?" ? `+${hkIncrease} hk` : "högre effekt";
  const nmIncreaseText = nmIncrease !== "?" ? `+${nmIncrease} Nm` : "bättre vridmoment";

  const pageDescription = cleanText(
    `Motoroptimering till ${brandData?.name} ${modelData?.name} ${engineData?.label} ${yearData?.range} ${hkIncreaseText} & ${nmIncreaseText} med skräddarsydd ${stageData.name} mjukvara. 2 års garanti & 30 dagars öppet köp!`,
  );

  const pageUrl = `https://tuning.aktuning.se${router.asPath.split("?")[0]}`;
  const imageUrl = "https://tuning.aktuning.se/ak-logo1.png";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />
        
        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: `Motoroptimering ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${stageData.name}`,
              description: pageDescription,
              image: imageUrl,
              brand: {
                "@type": "Brand",
                name: "AK-TUNING Motoroptimering",
              },
              offers: {
                "@type": "Offer",
                priceCurrency: "SEK",
                price: stageData.price || 0,
                availability: "https://schema.org/InStock",
                url: canonicalUrl,
              },
            }),
          }}
        />

        {/* Breadcrumbs */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Hem",
                  item: "https://tuning.aktuning.se",
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: brandData.name,
                  item: `https://tuning.aktuning.se/${brandSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: modelData.name,
                  item: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: yearData.range,
                  item: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 5,
                  name: engineData.label,
                  item: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 6,
                  name: stageData.name,
                  item: canonicalUrl,
                },
              ],
            }),
          }}
        />
      </Head>

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
              {cleanText(formatModelName(brandData.name, modelData.name))}{" "}
              {cleanText(yearData.range)} – {cleanText(engineData.label)}
            </h1>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-2">
              <Link
                href={`/${slugifySafe(brandData.slug?.current || brandData.name)}/${slugifySafe(modelData.slug?.current || modelData.name)}/${slugifyYear(yearData.range)}`}
                className="text-sm text-orange-500 hover:underline"
              >
                ← {translate(currentLanguage, "BACKTO")} {yearData.range}
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                href={`/${slugifySafe(brandData.slug?.current || brandData.name)}/${slugifySafe(modelData.slug?.current || modelData.name)}/${slugifyYear(yearData.range)}/${slugify(engineData.label)}`}
                className="text-sm text-orange-500 hover:underline"
              >
                ← {translate(currentLanguage, "BACKTO")} {engineData.label}
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="w-full p-6">
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
            {isDsgStage ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-6">
                {stageData.tcuFields?.launchControl && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "launchControl")}
                    </p>
                    <p>Original: {stageData.tcuFields.launchControl.original || "-"} RPM</p>
                    <p>Optimerad: <span className="text-green-400">{stageData.tcuFields.launchControl.optimized || "-"} RPM</span></p>
                  </div>
                )}
                {stageData.tcuFields?.rpmLimit && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "rpmLimit")}
                    </p>
                    <p>Original: {stageData.tcuFields.rpmLimit.original || "-"} RPM</p>
                    <p>Optimerad: <span className="text-green-400">{stageData.tcuFields.rpmLimit.optimized || "-"} RPM</span></p>
                  </div>
                )}
                {stageData.tcuFields?.shiftTime && (
                  <div className="border border-blue-400 rounded-lg p-3 text-white">
                    <p className="text-sm font-bold text-blue-300 mb-1">
                      {translate(currentLanguage, "shiftTime")}
                    </p>
                    <p>Original: {stageData.tcuFields.shiftTime.original || "-"} ms</p>
                    <p>Optimerad: <span className="text-green-400">{stageData.tcuFields.shiftTime.optimized || "-"} ms</span></p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
                <div className="border border-white rounded-lg p-3 text-center">
                  <p className="text-sm text-white font-bold mb-1">
                    {translate(currentLanguage, "originalHp")}
                  </p>
                  <p className="text-xl text-white font-bold">{stageData.origHk} hk</p>
                </div>
                <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                  <p className="text-xl text-white font-bold mb-1 uppercase">
                    {translateStageName(currentLanguage, stageData.name)} HK
                  </p>
                  <p className="text-xl font-bold">{stageData.tunedHk} hk</p>
                  <p className="text-xs mt-1 text-red-400">+{stageData.tunedHk - stageData.origHk} hk</p>
                </div>
                <div className="border border-white rounded-lg p-3 text-center">
                  <p className="text-sm text-white font-bold mb-1">
                    {translate(currentLanguage, "originalNm")}
                  </p>
                  <p className="text-xl text-white font-bold">{stageData.origNm} Nm</p>
                </div>
                <div className="border border-green-500 text-green-400 rounded-lg p-3 text-center">
                  <p className="text-xl text-white font-bold mb-1 uppercase">
                    {translateStageName(currentLanguage, stageData.name)} NM
                  </p>
                  <p className="text-xl font-bold">{stageData.tunedNm} Nm</p>
                  <p className="text-xs mt-1 text-red-400">+{stageData.tunedNm - stageData.origNm} Nm</p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <button
                onClick={() => setInfoModal({ open: true, type: "stage", stage: stageData })}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
              >
                📄 {translateStageName(currentLanguage, stageData.name).toUpperCase()} {translate(currentLanguage, "infoStage")}
              </button>

              <button
                onClick={() => setInfoModal({ open: true, type: "general" })}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
              >
                💡 {translate(currentLanguage, "infoGeneral")}
              </button>
            </div>

            {!isDsgStage && !isTruck && (
              <>
                <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase mt-6">
                  {translateStageName(currentLanguage, stageData.name).toUpperCase()} 
                </h3>
                
                <div className="flex justify-center items-center gap-4 md:hidden text-xs text-white mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-red-400 font-mono text-[12px] tracking-wide drop-shadow-[0_0_4px_rgba(255,0,0,0.6)]">
                      HK
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-blue-400 font-mono text-[12px] tracking-wide drop-shadow-[0_0_4px_rgba(59,130,246,0.6)]">
                      NM
                    </span>
                  </div>
                </div>

                <div className="relative h-96 bg-gray-900 rounded-lg p-4">
                  <Line
                    data={{
                      labels: rpmLabels,
                      datasets: [
                        {
                          label: `${translateStageName(currentLanguage, stageData.name)} HK`,
                          data: generateDynoCurve(
                            stageData.tunedHk || 0,
                            true,
                            engineData.fuel || "",
                          ),
                          borderColor: "#ef4444",
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          borderWidth: 3,
                          tension: 0.4,
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointBackgroundColor: "#ef4444",
                          pointBorderColor: "#ffffff",
                          pointBorderWidth: 1,
                          fill: false,
                        },
                        {
                          label: `${translateStageName(currentLanguage, stageData.name)} NM`,
                          data: generateDynoCurve(
                            stageData.tunedNm || 0,
                            false,
                            engineData.fuel || "",
                          ),
                          borderColor: "#3b82f6",
                          backgroundColor: "rgba(59, 130, 246, 0.1)",
                          borderWidth: 3,
                          tension: 0.4,
                          pointRadius: 3,
                          pointHoverRadius: 6,
                          pointBackgroundColor: "#3b82f6",
                          pointBorderColor: "#ffffff",
                          pointBorderWidth: 1,
                          fill: false,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top",
                          labels: {
                            color: "#d1d5db",
                            font: {
                              size: 14,
                              weight: "bold",
                            },
                            usePointStyle: true,
                          },
                        },
                        tooltip: {
                          backgroundColor: "rgba(17, 24, 39, 0.9)",
                          titleColor: "#f3f4f6",
                          bodyColor: "#d1d5db",
                          borderColor: "#374151",
                          borderWidth: 1,
                          cornerRadius: 8,
                          displayColors: true,
                          callbacks: {
                            label: function (context) {
                              const value = context.parsed.y;
                              const label = context.dataset.label || "";
                              const unit = label.includes("HK") ? "hk" : "Nm";
                              return `${label}: ${Math.round(value)} ${unit}`;
                            },
                          },
                        },
                      },
                      scales: {
                        x: {
                          grid: {
                            color: "rgba(55, 65, 81, 0.5)",
                          },
                          ticks: {
                            color: "#9ca3af",
                            font: {
                              size: 12,
                            },
                          },
                          title: {
                            display: true,
                            text: "RPM",
                            color: "#9ca3af",
                            font: {
                              size: 14,
                              weight: "bold",
                            },
                          },
                        },
                        y: {
                          grid: {
                            color: "rgba(55, 65, 81, 0.5)",
                          },
                          ticks: {
                            color: "#9ca3af",
                            font: {
                              size: 12,
                            },
                          },
                          title: {
                            display: true,
                            text: "HK / Nm",
                            color: "#9ca3af",
                            font: {
                              size: 14,
                              weight: "bold",
                            },
                          },
                        },
                      },
                    }}
                    plugins={[watermarkPlugin, shadowPlugin]}
                  />
                </div>
              </>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button
                onClick={(e) => handleBookNow(stageData.name, e)}
                className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white font-bold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 flex-1 text-center"
              >
                {translate(currentLanguage, "bookNow")} {stageData.name.toUpperCase()}
              </button>
            </div>
          </div>
        </div>

        {allOptions.length > 0 && (
          <div className="mt-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {translate(currentLanguage, "aktPlusOptions")}
              </h2>
              <div className="space-y-4">
                {allOptions.map((option) => (
                  <div
                    key={option._id}
                    className="border border-gray-600 rounded-lg p-4 bg-gray-750"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white">
                          {option.name}
                        </h3>
                        <p className="text-gray-300 text-sm mt-1">
                          {option.description}
                        </p>
                        {option.price && (
                          <p className="text-green-400 font-bold text-lg mt-2">
                            {option.price.toLocaleString()} kr
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <button
                          onClick={() => toggleOption(option._id)}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm"
                        >
                          {expandedOptions[option._id]
                            ? translate(currentLanguage, "showLess")
                            : translate(currentLanguage, "showMore")}
                        </button>
                        <button
                          onClick={(e) => handleBookNow(option.name, e)}
                          className="px-4 py-2 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white rounded-lg text-sm"
                        >
                          {translate(currentLanguage, "bookNow")}
                        </button>
                      </div>
                    </div>
                    {expandedOptions[option._id] && (
                      <div className="mt-4 text-gray-300">
                        {option.detailedDescription && (
                          <div className="prose prose-invert max-w-none">
                            <PortableText
                              value={option.detailedDescription}
                              components={portableTextComponents}
                            />
                          </div>
                        )}
                        {option.benefits && option.benefits.length > 0 && (
                          <div className="mt-4">
                            <h4 className="font-semibold text-white mb-2">
                              {translate(currentLanguage, "benefits")}:
                            </h4>
                            <ul className="list-disc list-inside space-y-1">
                              {option.benefits.map((benefit, index) => (
                                <li key={index}>{benefit}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {dynamicDescription && (
          <div className="mt-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                {translate(currentLanguage, "about")} {stageData.name}
              </h2>
              <div className="prose prose-invert max-w-none text-gray-300">
                <PortableText
                  value={dynamicDescription}
                  components={portableTextComponents}
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 bg-gray-800 rounded-xl shadow-lg border border-gray-700 overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              {translate(currentLanguage, "fuelSavingCalculator")}
            </h2>
            <FuelSavingCalculator
              currentLanguage={currentLanguage}
              engineData={engineData}
              stageData={stageData}
            />
          </div>
        </div>
      </div>

      <ContactModal
        isOpen={contactModalData.isOpen}
        onClose={() =>
          setContactModalData({ isOpen: false, stageOrOption: "", link: "" })
        }
        stageOrOption={contactModalData.stageOrOption}
        link={contactModalData.link}
        scrollPosition={contactModalData.scrollPosition}
        currentLanguage={currentLanguage}
      />

      {infoModal.open && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">
                  {infoModal.type === "stage"
                    ? `${stageData.name.toUpperCase()} ${translate(currentLanguage, "infoStage")}`
                    : translate(currentLanguage, "infoGeneral")}
                </h3>
                <button
                  onClick={() => setInfoModal({ open: false, type: "general" })}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
              {infoModal.type === "stage" && infoModal.stage && (
                <div className="text-gray-300 space-y-4">
                  <p>
                    {translate(currentLanguage, "stageInfoDescription")}
                  </p>
                  <div className="bg-gray-750 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">
                      {translate(currentLanguage, "whatsIncluded")}:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{translate(currentLanguage, "stageInfo1")}</li>
                      <li>{translate(currentLanguage, "stageInfo2")}</li>
                      <li>{translate(currentLanguage, "stageInfo3")}</li>
                      <li>{translate(currentLanguage, "stageInfo4")}</li>
                      <li>{translate(currentLanguage, "stageInfo5")}</li>
                      <li>{translate(currentLanguage, "stageInfo6")}</li>
                    </ul>
                  </div>
                </div>
              )}
              {infoModal.type === "general" && (
                <div className="text-gray-300 space-y-4">
                  <p>
                    {translate(currentLanguage, "generalInfoDescription")}
                  </p>
                  <div className="bg-gray-750 p-4 rounded-lg">
                    <h4 className="font-semibold text-white mb-2">
                      {translate(currentLanguage, "whatsIncluded")}:
                    </h4>
                    <ul className="list-disc list-inside space-y-1">
                      <li>{translate(currentLanguage, "generalInfo1")}</li>
                      <li>{translate(currentLanguage, "generalInfo2")}</li>
                      <li>{translate(currentLanguage, "generalInfo3")}</li>
                      <li>{translate(currentLanguage, "generalInfo4")}</li>
                      <li>{translate(currentLanguage, "generalInfo5")}</li>
                      <li>{translate(currentLanguage, "generalInfo6")}</li>
                      <li>{translate(currentLanguage, "generalInfo7")}</li>
                    </ul>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setInfoModal({ open: false, type: "general" })}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  {translate(currentLanguage, "close")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

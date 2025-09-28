// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import NextImage from "next/image";
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
  AktPlusOptionReference,
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

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<EnginePageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  try {
    const lang =
      (typeof context.query.lang === "string" ? context.query.lang : null) ||
      "sv";
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

    return rpmRange.map((rpm, i) => {
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

    return rpmRange.map((rpm, i) => {
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
    {},
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

  const [infoModal, setInfoModal] = useState<{
    open: boolean;
    type: "stage" | "general";
    stage?: Stage;
  }>({ open: false, type: "stage" });

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
    event?: React.MouseEvent,
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
    const img = new Image();
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
        {} as Record<string, boolean>,
      );
      setExpandedStages(initialExpanded);
    }
  }, [engineData, stage]);

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

  const mergedAktPlusOptions = useMemo(() => {
    const optionMap = new Map<string, AktPlusOption>();

    engineData?.stages?.forEach((stage) => {
      getAllAktPlusOptions(stage).forEach((opt) => {
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
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [stage]);

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

  const getSlugValue = (slug: any, fallback: string) => {
    return typeof slug === "string" ? slug : slug?.current || fallback;
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

  const toggleStage = (stageName: string) => {
    setExpandedStages((prev) => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = key === stageName ? !prev[key] : false;
      });
      return newState;
    });
  };

  const getUniqueAktPlusOptions = () => {
    if (!engineData || !engineData.stages?.length) return [];

    const allOptions = engineData.stages.flatMap((stage) =>
      getAllAktPlusOptions(stage),
    );

    const uniqueMap = new Map<string, AktPlusOption>();
    allOptions.forEach((opt) => {
      if (!uniqueMap.has(opt._id)) uniqueMap.set(opt._id, opt);
    });

    return Array.from(uniqueMap.values());
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptions((prev) => {
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
    setExpandedAktPlus((prev) => ({
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

  const selectedStage = engineData?.stages?.find((s) => expandedStages[s.name]);
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

  const stageRefs = engineData.stages
    .map((s) => (s as any)?._id)
    .filter(Boolean);

  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`;

  const pageTitle = cleanText(
    `Motoroptimering ${brandData.name} ${modelData.name} ${engineData.label} ${yearData.range} – ${selectedStep}`,
  );
  const hkIncreaseText =
    hkIncrease !== "?" ? `+${hkIncrease} hk` : "högre effekt";
  const nmIncreaseText =
    nmIncrease !== "?" ? `+${nmIncrease} Nm` : "bättre vridmoment";

  const pageDescription = cleanText(
    `Motoroptimering till ${brandData.name} ${modelData.name} ${engineData.label} ${yearData.range} ${hkIncreaseText} & ${nmIncreaseText} med skräddarsydd ${selectedStep} mjukvara. 2 års garanti & 30 dagars öppet köp!`,
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
    data: Record<string, string | number>,
  ): string {
    return template.replace(/{{(.*?)}}/g, (_, key) => {
      return data[key.trim()]?.toString() || "";
    });
  }

  const createDynamicDescription = (
    description: any[],
    stage: Stage | undefined,
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

        {/* Structured Data: Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AK-TUNING Motoroptimering",
              url: "https://tuning.aktuning.se",
              logo: "https://tuning.aktuning.se/ak-logo2.png",
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `Motoroptimering för ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label}`,
              itemListElement: [
                ...[...engineData.stages]
                  .sort((a, b) => {
                    const extractSortValue = (name: string) => {
                      const match = name.toLowerCase().match(/steg\s?(\d+)/);
                      return match ? parseInt(match[1], 10) : 999;
                    };
                    return extractSortValue(a.name) - extractSortValue(b.name);
                  })
                  .map((stage, index) => {
                    const hasPrice =
                      typeof stage.price === "number" && stage.price > 0;

                    const templateDescription = extractPlainTextFromDescription(
                      stage.descriptionRef?.description ||
                        stage.description?.["sv"] ||
                        "",
                    );

                    const fullDescription =
                      renderDescription(templateDescription, {
                        stageName: stage.name,
                        brand: brandData.name,
                        model: modelData.name,
                        year: yearData.range,
                        engine: engineData.label,
                        origHk: stage.origHk || "",
                        tunedHk: stage.tunedHk || "",
                        origNm: stage.origNm || "",
                        tunedNm: stage.tunedNm || "",
                        hkIncrease:
                          stage.tunedHk && stage.origHk
                            ? stage.tunedHk - stage.origHk
                            : "",
                        nmIncrease:
                          stage.tunedNm && stage.origNm
                            ? stage.tunedNm - stage.origNm
                            : "",
                      }) || "Kontakta oss för offert!";

                    return {
                      "@type": "ListItem",
                      position: index + 1,
                      item: {
                        "@type": "Product",
                        name: `Motoroptimering ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${stage.name}`,
                        image: [imageUrl],
                        description: hasPrice
                          ? fullDescription
                          : `${fullDescription}\nKontakta oss för offert!`,
                        brand: {
                          "@type": "Brand",
                          name: "AK-TUNING Motoroptimering",
                          logo: "https://tuning.aktuning.se/ak-logo1.png",
                        },
                        offers: hasPrice
                          ? {
                              "@type": "Offer",
                              priceCurrency: "SEK",
                              price: stage.price,
                              availability: "https://schema.org/InStock",
                              url: `${canonicalUrl}?stage=${slugifyStage(stage.name)}`,
                            }
                          : {
                              "@type": "Offer",
                              priceCurrency: "SEK",
                              price: 0,
                              availability: "https://schema.org/InStock",
                              url: `${canonicalUrl}?stage=${slugifyStage(stage.name)}`,
                              description: "Kontakta oss för offert",
                            },
                      },
                    };
                  }),

                ...mergedAktPlusOptions
                  .filter((opt) => {
                    const isLinkedToStage =
                      opt.manualAssignments?.some((ref) =>
                        engineData.stages?.some(
                          (stage) =>
                            ref._ref === (stage as any)._id ||
                            ref._ref === stage.name,
                        ),
                      ) ?? false;

                    const title =
                      typeof opt.title === "string"
                        ? opt.title
                        : opt.title?.sv || "";

                    return !isLinkedToStage && !/steg\s?\d+/i.test(title);
                  })
                  .sort((a, b) => {
                    const titleA =
                      typeof a.title === "string" ? a.title : a.title?.sv || "";
                    const titleB =
                      typeof b.title === "string" ? b.title : b.title?.sv || "";
                    return titleA.localeCompare(titleB);
                  })
                  .map((opt, i) => ({
                    "@type": "ListItem",
                    position: engineData.stages.length + i + 1,
                    item: {
                      "@type": "Product",
                      name: `${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${
                        typeof opt.title === "string"
                          ? opt.title
                          : opt.title?.sv || ""
                      }`,
                      ...(opt.description && {
                        description: extractPlainTextFromDescription(
                          typeof opt.description === "string"
                            ? opt.description
                            : opt.description?.sv || "",
                        ),
                      }),
                      ...(opt.gallery?.[0]?.asset?.url && {
                        image: opt.gallery[0].asset.url,
                      }),
                      ...(typeof opt.price === "number" &&
                        opt.price > 0 && {
                          offers: {
                            "@type": "Offer",
                            priceCurrency: "SEK",
                            price: opt.price,
                            availability: "https://schema.org/InStock",
                            url: canonicalUrl,
                          },
                        }),
                    },
                  })),
              ],
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
                  name: `${engineData.label} - ${selectedStep}`,
                  item: canonicalUrl,
                },
              ],
            }),
          }}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: `Vad kostar ${selectedStep} optimering för ${brandData.name} ${modelData.name} ${engineData.label}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `${selectedStep} mjukvara för ${brandData.name} ${modelData.name} ${engineData.label} kostar ${price}. Priset inkluderar skräddarsydd mjukvara, diagnostik, samt loggning innan och efter optimering. 2 års mjukvaru garanti och 30 dagars öppet köp.`,
                  },
                },
                {
                  "@type": "Question",
                  name: `Hur mycket ökar effekten med ${selectedStep} till ${brandData.name} ${modelData.name} ${engineData.label}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Med ${selectedStep} ökar effekten från ${selectedStage?.origHk} hk till ${selectedStage?.tunedHk} hk (+${hkIncrease} hk) och vridmomentet från ${selectedStage?.origNm} Nm till ${selectedStage?.tunedNm} Nm (+${nmIncrease} Nm).`,
                  },
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
          {!engineData ? (
            <h1 className="text-xl sm:text-3xl md:text-xl font-bold">
              {translate(currentLanguage, "tuningIntro")}
            </h1>
          ) : (
            <div>
              <h1 className="text-xl sm:text-3xl md:text-xl font-bold mb-2">
                {translate(currentLanguage, "tuningIntro")}{" "}
                {cleanText(formatModelName(brandData.name, modelData.name))}{" "}
                {cleanText(yearData.range)} – {cleanText(engineData.label)}
              </h1>
              <Link
                href={`/${slugifySafe(brandData.slug?.current || brandData.name)}/${slugifySafe(modelData.slug?.current || modelData.name)}/${slugifyYear(yearData.range)}`}
                className="text-sm text-orange-500 hover:underline"
              >
                ← {translate(currentLanguage, "BACKTO")} {yearData.range}
              </Link>
            </div>
          )}
        </div>
        {engineData.stages?.length > 0 ? (
          <div className="space-y-6">
            {engineData.stages.map((stage) => {
              const isDsgStage = stage.name.toLowerCase().includes("dsg");
              const isTruck = brandData.name.startsWith("[LASTBIL]");
              const allOptions = getAllAktPlusOptions(stage);
              const isExpanded = expandedStages[stage.name] ?? false;

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
                          <img
                            src={urlFor(brandData.logo).width(60).url()}
                            alt={brandData.name}
                            className="h-8 w-auto object-contain"
                            width="35"
                            height="35"
                          />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                          {engineData.label} -{" "}
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
                          width={66}
                          height={32}
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

                  {isExpanded && brandData.name.startsWith("[LASTBIL]") && (
                    <FuelSavingCalculator stage={stage} />
                  )}

                  {isExpanded && (
                    <div className="px-6 pb-6">
                      {isDsgStage ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 mt-6">
                          {/* DSG/TCU-FÄLT */}
                          {stage.tcuFields?.launchControl && (
                            <div className="border border-blue-400 rounded-lg p-3 text-white">
                              <p className="text-sm font-bold text-blue-300 mb-1">
                                {translate(currentLanguage, "launchControl")}
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
                                {translate(currentLanguage, "rpmLimit")}
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
                                {translate(currentLanguage, "shiftTime")}
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
                            setInfoModal({ open: true, type: "stage", stage })
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
                        {/* Ny, korrekt kod */}
                        <div className="sr-only" aria-hidden="false">
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
                                ---
                              </span>
                              <span className="text-white">ORG HK</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-red-600 font-mono text-[12px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                ━━━
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
                                ---
                              </span>
                              <span className="text-white">ORG NM</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-white font-mono text-[12px] drop-shadow-[0_0_4px_rgba(239,68,68,0.9)]">
                                ━━━
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
                            {isExpanded && !isDsgStage && !isTruck && (
                              <Line
                                data={{
                                  labels: rpmLabels,
                                  datasets: [
                                    {
                                      label: "ORG",
                                      data: generateDynoCurve(
                                        stage.origHk,
                                        true,
                                        engineData.fuel,
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
                                      label: `ST ${stage.name.replace(/\D/g, "")}`,
                                      data: generateDynoCurve(
                                        stage.tunedHk,
                                        true,
                                        engineData.fuel,
                                      ),
                                      borderColor: "#f87171",
                                      backgroundColor: "#f87171",
                                      borderWidth: 3,
                                      tension: 0.5,
                                      pointRadius: 0,
                                      yAxisID: "hp",
                                    },
                                    {
                                      label: "ORG",
                                      data: generateDynoCurve(
                                        stage.origNm,
                                        false,
                                        engineData.fuel,
                                      ),
                                      borderColor: "#FFFFFF",
                                      backgroundColor: "#000000",
                                      borderWidth: 2,
                                      borderDash: [5, 3],
                                      tension: 0.5,
                                      pointRadius: 0,
                                      yAxisID: "nm",
                                    },
                                    {
                                      label: `ST ${stage.name.replace(/\D/g, "")}`,
                                      data: generateDynoCurve(
                                        stage.tunedNm,
                                        false,
                                        engineData.fuel,
                                      ),
                                      borderColor: "#FFFFFF",
                                      backgroundColor: "#FFFFFF",
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
                            )}
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
                                      translate(currentLanguage, "stageLabel"),
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

                              {/* Social Media Links - Now centered underneath */}
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
                                width="120"
                                height="32"
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
                                                "priceLabel",
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
            setContactModalData({ isOpen: false, stageOrOption: "", link: "" })
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

                return;
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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    modalRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

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

// pages/[brand]/[model]/[year]/[engine].tsx
import {GetServerSideProps} from "next";
import NextImage from "next/image";
import {useRouter} from "next/router";
import client from "@/lib/sanity";
import {engineByParamsQuery} from "@/src/lib/queries";
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

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

const Line = dynamic(() => import("react-chartjs-2").then(mod => mod.Line), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => (
    <div className="h-96 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-400">Laddar dynobild...</p>
    </div>
  ),
});

const normalizeString = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]/g, "");

export const getServerSideProps: GetServerSideProps<
  EnginePageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
  const engine = decodeURIComponent((context.params?.engine as string) || "");

  try {
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return {notFound: true};

    const modelData =
      brandData.models?.find(
        (m: Model) =>
          normalizeString(m.name) === normalizeString(model) ||
          (m.slug &&
            normalizeString(
              typeof m.slug === "string" ? m.slug : m.slug.current
            ) === normalizeString(model))
      ) || null;

    if (!modelData) return {notFound: true};

    const yearData =
      modelData.years?.find(
        (y: Year) =>
          normalizeString(y.range) === normalizeString(year) ||
          (y.slug && normalizeString(y.slug) === normalizeString(year))
      ) || null;

    if (!yearData) return {notFound: true};

    const engineData =
      yearData.engines?.find(
        (e: Engine) =>
          normalizeString(e.label) === normalizeString(engine) ||
          (e.slug && normalizeString(e.slug) === normalizeString(engine))
      ) || null;

    if (!engineData) return {notFound: true};

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
  if (!description || !Array.isArray(description)) return "";

  return description
    .map(block => {
      if (block._type === "block" && Array.isArray(block.children)) {
        return block.children.map(child => child.text).join("");
      }
      return "";
    })
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

const generateDynoCurve = (
  peakValue: number,
  isHp: boolean,
  fuelType: string
) => {
  // Välj RPM range beroende på motor
  const rpmRange = fuelType.toLowerCase().includes("diesel")
    ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
    : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

  const peakIndex = isHp
    ? Math.floor(rpmRange.length * 0.6)
    : Math.floor(rpmRange.length * 0.4);
  const startIndex = 0;

  return rpmRange.map((rpm, i) => {
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

const getStageColor = (stageName: string) => {
  const name = stageName.toLowerCase();
  if (name.includes("steg 1")) return "text-red-500";
  if (name.includes("steg 2")) return "text-orange-400";
  if (name.includes("steg 3")) return "text-purple-400";
  if (name.includes("steg 4")) return "text-yellow-400";
  if (name.includes("dsg")) return "text-blue-400";
  return "text-white"; // fallback
};

export default function EnginePage({
  brandData,
  modelData,
  yearData,
  engineData,
}: EnginePageProps) {
  const router = useRouter();
  const stageParam = router.query.stage;
  const stage = typeof stageParam === "string" ? stageParam : "";
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

  const getAllAktPlusOptions = useMemo(
    () => (stage: Stage) => {
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
    },
    [engineData, allAktOptions]
  );

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
  }, [engineData, getAllAktPlusOptions]);

  useEffect(() => {
    const fetchAktPlus = async () => {
      try {
        const res = await fetch("/api/aktplus-options");
        const data = await res.json();
        setAllAktOptions(data.options || []);
      } catch (err) {
        console.error("AKT+ load fail", err);
      }
    };

    fetchAktPlus();
  }, []);

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

  const toggleStage = (stageName: string) => {
    setExpandedStages(prev => {
      const newState: Record<string, boolean> = {};
      Object.keys(prev).forEach(key => {
        newState[key] = key === stageName ? !prev[key] : false;
      });
      return newState;
    });
  };

  const getUniqueAktPlusOptions = () => {
    if (!engineData || !engineData.stages?.length) return [];

    const allOptions = engineData.stages.flatMap(stage =>
      getAllAktPlusOptions(stage)
    );

    const uniqueMap = new Map<string, AktPlusOption>();
    allOptions.forEach(opt => {
      if (!uniqueMap.has(opt._id)) uniqueMap.set(opt._id, opt);
    });

    return Array.from(uniqueMap.values());
  };

  const toggleOption = (optionId: string) => {
    setExpandedOptions(prev => {
      const newState: Record<string, boolean> = {};
      newState[optionId] = !prev[optionId];
      return newState;
    });
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

  const rpmLabels = engineData.fuel.toLowerCase().includes("diesel")
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

  const pageTitle = `Motoroptimering ${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${selectedStep}`;

  const pageDescription = `Motoroptimering till ${brandData.name} ${modelData.name} ${engineData.label} ökning +${hkIncrease} hk & +${nmIncrease} Nm med skräddarsydd ${selectedStep} mjukvara. 2 års garanti & 30 dagars öppet köp!`;

  const pageUrl = `https://tuning.aktuning.se${router.asPath.split("?")[0]}`;

  const imageUrl = "https://tuning.aktuning.se/ak-logo2.png";

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

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />

        <link
          rel="canonical"
          href={`https://tuning.aktuning.se${router.asPath}`}
        />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:image" content={imageUrl} />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Structured Data: Product */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Product",
              name: `${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${selectedStep} Mjukvara`,
              image: [imageUrl],
              description: pageDescription,
              brand: {
                "@type": "Brand",
                name: "AK-TUNING",
                logo: "https://tuning.aktuning.se/ak-logo2.png",
              },
              offers: selectedStage?.price
                ? {
                    "@type": "Offer",
                    priceCurrency: "SEK",
                    price: selectedStage.price,
                    availability: "https://schema.org/InStock",
                    url: pageUrl,
                  }
                : undefined,
            }),
          }}
        />

        {/* Structured Data: Organization for LOGO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "AK-TUNING",
              url: "https://tuning.aktuning.se",
              logo: "https://tuning.aktuning.se/ak-logo2.png",
            }),
          }}
        />

        {/* ✅ Structured Data: AKT+ options — merged across all stages */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ItemList",
              name: `AKT+ tillägg för ${brandData.name} ${modelData.name} ${engineData.label}`,
              itemListElement: mergedAktPlusOptions.map((opt, index) => ({
                "@type": "ListItem",
                position: index + 1,
                item: {
                  "@type": "Product",
                  name: opt.title,
                  ...(opt.description && {
                    description: extractPlainTextFromDescription(
                      opt.description
                    ),
                  }),
                  ...(opt.gallery?.[0]?.asset?.url && {
                    image: opt.gallery[0].asset.url,
                  }),
                  ...(opt.price && {
                    offers: {
                      "@type": "Offer",
                      priceCurrency: "SEK",
                      price: opt.price,
                      availability: "https://schema.org/InStock",
                      url: pageUrl,
                    },
                  }),
                },
              })),
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
        <div className="mb-8">
          <h1 className="text-xl sm:text-3xl md:text-xl font-bold text-center">
            {translate(currentLanguage, "tuningIntro")} {brandData.name}{" "}
            {modelData.name} {yearData.range} {engineData.label}
          </h1>
        </div>{" "}
        {engineData.stages?.length > 0 ? (
          <div className="space-y-6">
            {engineData.stages.map(stage => {
              const isDsgStage = stage.name.toLowerCase().includes("dsg");
              const allOptions = getAllAktPlusOptions(stage);
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
                          <img
                            src={urlFor(brandData.logo).width(60).url()}
                            alt={brandData.name}
                            className="h-8 w-auto object-contain"
                          />
                        )}
                        <h2 className="text-lg font-semibold text-white">
                          {engineData.label} -{" "}
                          <span
                            className={`uppercase tracking-wide ${getStageColor(stage.name)}`}
                          >
                            [{stage.name}]
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
                              {stage.name} HK
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
                              {stage.name} NM
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
                          📄 {stage.name.toUpperCase()}{" "}
                          {translate(currentLanguage, "infoStage")}
                        </button>
                        {/* Hidden SEO content for stage info */}
                        <div className="sr-only" aria-hidden="false">
                          <h2>{stage.name.toUpperCase()} INFORMATION</h2>
                          {stage.description && (
                            <PortableText value={stage.description} />
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
                            {stage.name} effektkurva
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
                                      engineData.fuel
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
                                      engineData.fuel
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
                                      engineData.fuel
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
                                      engineData.fuel
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
                                        "powerLabel"
                                      ),
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
                                      text: translate(
                                        currentLanguage,
                                        "torqueLabel"
                                      ),
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
                                width={66}
                                height={32}
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
                              {allOptions.map(option => (
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
                                            option.title
                                          }
                                          className="h-10 w-10 object-contain"
                                        />
                                      )}
                                      <span className="text-lg font-bold text-orange-600">
                                        {option.title}
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
                                      {option.description && (
                                        <div className="prose prose-invert max-w-none text-sm">
                                          <PortableText
                                            value={option.description}
                                            components={portableTextComponents}
                                          />
                                        </div>
                                      )}

                                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                        {option.price && (
                                          <p className="font-bold text-green-400">
                                            Pris:{" "}
                                            {option.price.toLocaleString()} kr
                                          </p>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleBookNow(option.title)
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
                              ))}
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
        <InfoModal
          isOpen={infoModal.open}
          onClose={() => setInfoModal({open: false, type: infoModal.type})}
          title={
            infoModal.type === "stage"
              ? `STEG ${infoModal.stage?.name.replace(/\D/g, "")} INFORMATION`
              : "GENERELL INFORMATION"
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
              <div id="general-info-content">
                <ul className="space-y-2">
                  <li>✅ All mjukvara är skräddarsydd för din bil</li>
                  <li>✅ Felsökning inann samt efter optimering</li>
                  <li>✅ Loggning för att anpassa en individuell mjukvara</li>
                  <li>✅ Optimerad för både prestanda och bränsleekonomi</li>
                </ul>

                <div className="mt-6 text-sm text-gray-400 leading-relaxed">
                  <p>
                    AK-TUNING är specialister på skräddarsydd motoroptimering,
                    chiptuning och ECU-programmering för alla bilmärken.
                  </p>
                  <p className="mt-2">
                    Vi erbjuder effektökning, bättre bränsleekonomi och
                    optimerade köregenskaper. Tjänster i Göteborg, Stockholm,
                    Malmö, Jönköping, Örebro och Storvik.
                  </p>
                  <p className="mt-2">
                    All mjukvara utvecklas in-house med fokus på kvalitet,
                    säkerhet och lång livslängd. Välkommen till en ny nivå av
                    bilprestanda med AK-TUNING.
                  </p>
                </div>
              </div>
            )
          }
          currentLanguage={currentLanguage}
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
  currentLanguage,
  id,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
  id: string;
  currentLanguage: string;
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
            ❌ {translate(currentLanguage, "closeButton")}
          </button>
        </div>
      </div>
    </div>
  );
};

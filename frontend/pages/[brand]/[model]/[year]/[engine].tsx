// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
import NextImage from "next/image";
import { useRouter } from "next/router";
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
import SEOHead from "@/components/SEOHead";
import StageDetails from "@/components/StageDetails";
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

interface EnginePageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
  engineData: Engine | null;
}

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false, // Disable server-side rendering for this component
  loading: () => (
    <div className="h-96 bg-gray-800 rounded-lg animate-pulse flex items-center justify-center">
      <p className="text-gray-400">Laddar dynobild...</p>
    </div>
  ),
});

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
      // Handle custom block types with simple 'text' field fallback
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
      <SEOHead
        canonicalUrl={canonicalUrl}
        pageUrl={pageUrl}
        imageUrl={imageUrl}
        pageTitle={pageTitle}
        pageDescription={pageDescription}
        brandData={brandData}
        modelData={modelData}
        yearData={yearData}
        engineData={engineData}
        mergedAktPlusOptions={mergedAktPlusOptions}
        slugifyStage={slugifyStage}
      />

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
            {engineData.stages.map((stage) => {
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

                  <StageDetails
                    stage={stage}
                    engineData={engineData}
                    currentLanguage={currentLanguage}
                    allOptions={allOptions}
                    isExpanded={isExpanded}
                    expandedAktPlus={expandedAktPlus}
                    expandedOptions={expandedOptions}
                    toggleAktPlus={toggleAktPlus}
                    toggleOption={toggleOption}
                    setInfoModal={setInfoModal}
                    handleBookNow={handleBookNow}
                    rpmLabels={rpmLabels}
                    isDsgStage={isDsgStage}
                    portableTextComponents={portableTextComponents}
                    watermarkPlugin={watermarkPlugin}
                    shadowPlugin={shadowPlugin}
                  />
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
            infoModal.type === "stage"
              ? translate(currentLanguage, "stageInfoPrefix").replace(
                  "{number}",
                  infoModal.stage?.name.replace(/\D/g, "") || "",
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

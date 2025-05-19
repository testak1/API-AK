// pages/[brand]/[model]/[year]/[engine].tsx
import { GetServerSideProps } from "next";
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
import { Line } from "react-chartjs-2";

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
    const brandData = await client.fetch(engineByParamsQuery, {
      brand: brand.toLowerCase(),
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
  if (name.includes("steg 4")) return "text-green-400";
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
    const finalLink = `https://api.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}#${stageSlug}`;

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

  // Load watermark image
  useEffect(() => {
    const img = new Image();
    img.src = "/ak-logo.png";
    img.onload = () => {
      watermarkImageRef.current = img;
    };
  }, []);

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

  const getAllAktPlusOptions = useMemo(
    () => (stage: Stage) => {
      if (!engineData) return [];

      const combinedOptions: AktPlusOptionReference[] = [
        ...(engineData.globalAktPlusOptions || []),
        ...(stage.aktPlusOptions || []),
      ];

      const uniqueOptionsMap = new Map<string, AktPlusOption>();

      (combinedOptions as AktPlusOptionReference[])
        .filter(isExpandedAktPlusOption)
        .forEach((opt) => {
          if (
            (opt.isUniversal ||
              opt.applicableFuelTypes?.includes(engineData.fuel) ||
              opt.manualAssignments?.some(
                (ref) => ref._ref === engineData._id,
              )) &&
            (!opt.stageCompatibility || opt.stageCompatibility === stage.name)
          ) {
            uniqueOptionsMap.set(opt._id, opt);
          }
        });

      return Array.from(uniqueOptionsMap.values());
    },
    [engineData],
  );

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
  const price =
    selectedStage?.price != null
      ? `${selectedStage.price.toLocaleString()} kr`
      : "";

  const pageTitle = `${brandData.name} ${modelData.name} ${yearData.range} ${engineData.label} – ${selectedStep} Mjukvara | AK-TUNING`;

  const pageDescription = `Motoroptimera din ${brandData.name} ${modelData.name} ${engineData.label} – från ${selectedStage?.origHk} hk till ${hp} hk och ${nm} Nm med skräddarsydd ${selectedStep} mjukvara. 2 års mjukvaru garanti samt 30 dagar öppet köp! Endast: ${price}.`;

  const pageUrl = `https://tuning.aktuning.se${router.asPath.split("?")[0]}`;

  const imageUrl = brandData.logo?.asset
    ? urlFor(brandData.logo).width(600).url()
    : "https://aktuning.se/img/ak-tuning-custom-engine-tuning-logo-1573781489.jpg";

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
                name: brandData.name,
                logo:
                  typeof brandData.logo === "object" &&
                  "asset" in brandData.logo &&
                  brandData.logo.asset &&
                  "url" in brandData.logo.asset
                    ? brandData.logo.asset.url
                    : undefined,
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
              publisher: {
                "@type": "Organization",
                name: "AK-TUNING – Marknadsledande på motoroptimering",
                logo: {
                  "@type": "ImageObject",
                  url: "https://tuning.aktuning.se/ak-logo1.png",
                },
              },
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
              logo: "https://tuning.aktuning.se/ak-logo1.png",
            }),
          }}
        />
      </Head>

      <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
        <div className="flex items-center mb-4">
          <img
            src="/ak-logo-svart.png"
            fetchPriority="high"
            alt="AK-TUNING"
            style={{ height: "80px", cursor: "pointer" }}
            className="h-12 object-contain"
            onClick={() => (window.location.href = "/")}
          />
        </div>
        <div className="mb-8">
          <h5 className="text-2xl sm:text-3xl md:text-2xl font-bold text-center">
            {brandData.name} {modelData.name} {yearData.range}{" "}
            {engineData.label}
          </h5>
        </div>{" "}
        {engineData.stages?.length > 0 ? (
          <div className="space-y-6">
            {engineData.stages.map((stage) => {
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
                          className="h-8 object-contain"
                        />
                        <span className="inline-block bg-red-600 text-black px-4 py-1 rounded-full text-xl font-semibold shadow-md">
                          {stage.price?.toLocaleString()} kr
                        </span>
                        {(stage.name.includes("Steg 2") ||
                          stage.name.includes("Steg 3") ||
                          stage.name.includes("Steg 4")) && (
                          <p className="text-xs text-gray-400 mt-2 italic">
                            Priset omfattar enbart mjukvaran.
                            <br />
                            Kontakta oss för offert inkl hårdvara!
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 mt-6">
                        <div className="border border-white rounded-lg p-3 text-center">
                          <p className="text-sm text-white font-bold mb-1">
                            ORIGINAL HK
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
                            ORIGINAL NM
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
                      <div className="flex flex-col sm:flex-row gap-4 mt-4">
                        <button
                          onClick={() =>
                            setInfoModal({ open: true, type: "stage", stage })
                          }
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                        >
                          📄 STEG {stage.name.replace(/\D/g, "")} INFORMATION
                        </button>
                        <button
                          onClick={() =>
                            setInfoModal({ open: true, type: "general" })
                          }
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg shadow"
                        >
                          💡 GENERELL INFORMATION
                        </button>
                      </div>
                      <div className="mt-6">
                        <h3 className="text-lg font-medium text-gray-300 mb-2 uppercase">
                          {stage.name}
                        </h3>

                        {/* Mobile-only legend above chart */}
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
                                    engineData.fuel,
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
                                  label: "ORG NM",
                                  data: generateDynoCurve(
                                    stage.origNm,
                                    false,
                                    engineData.fuel,
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
                                    engineData.fuel,
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
                                      const label = context.dataset.label || "";
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
                                    font: { size: 14 },
                                  },
                                  min: 0,
                                  max:
                                    Math.ceil(stage.tunedHk / 100) * 100 + 100,
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
                                    Math.ceil(stage.tunedNm / 100) * 100 + 100,
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
                            (Simulerad effektkurva)
                          </div>
                        </div>

                        {/* Mobile-only small tuned specs */}
                        <div className="block md:hidden text-center mt-6 mb-6">
                          <p className="text-sm text-white font-semibold">
                            {stage.tunedHk} HK & {stage.tunedNm} NM
                            <span className="text-gray-400 text-sm ml-1">
                              [
                              {stage.name
                                .replace("Steg", "STEG ")
                                .replace(/\s+/g, "")
                                .toUpperCase()}
                              ]
                            </span>
                          </p>
                        </div>

                        {/* NOW start new block for the contact button */}

                        {/* KONTAKT button */}
                        <div className="mt-8 mb-10 flex flex-col items-center">
                          <button
                            onClick={() => handleBookNow(stage.name)}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium shadow-lg flex items-center gap-2"
                          >
                            <span>📩</span> KONTAKT
                          </button>
                        </div>
                      </div>

                      {allOptions.length > 0 && (
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
                                TILLÄGG
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
                              {allOptions.map((option) => (
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
                                          📩 KONTAKT
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
          onClose={() => setInfoModal({ open: false, type: "stage" })}
          title={
            infoModal.type === "stage"
              ? `STEG ${infoModal.stage?.name.replace(/\D/g, "")} INFORMATION`
              : "GENERELL INFORMATION"
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
              <div>
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
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
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

        {/* ✅ STÄNG-KNAPP LÄNGST NER */}
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            ❌ STÄNG
          </button>
        </div>
      </div>
    </div>
  );
};

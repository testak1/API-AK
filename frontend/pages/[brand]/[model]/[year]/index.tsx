// pages/[brand]/[model]/[year]/index.tsx
import Head from "next/head";
import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year, Engine } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import NextImage from "next/image";

// --- slug helpers ---
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

const getSlug = (slug: any, fallback: string, isYear = false) => {
  const val =
    typeof slug === "string" ? slug : slug?.current ? slug.current : fallback;
  return isYear ? slugifyYear(val) : slugifySafe(val);
};

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

export const getServerSideProps: GetServerSideProps<YearPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, { brand });
  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        getSlug(m.slug, m.name).toLowerCase() ===
        getSlug(model, model).toLowerCase(),
    ) || null;

  if (!modelData) return { notFound: true };

  const yearData =
    modelData.years?.find(
      (y: Year) =>
        getSlug(y.slug, y.range, true).toLowerCase() ===
        getSlug(year, year, true).toLowerCase(),
    ) || null;

  if (!yearData) return { notFound: true };

  return { props: { brandData, modelData, yearData } };
};

// --- fuel grouping helpers ---
const normalizeFuel = (
  fuelRaw: string | undefined,
  labelRaw: string | undefined,
) => {
  const fuel = (fuelRaw || "").toLowerCase().trim();
  const label = (labelRaw || "").toLowerCase();

  if (/\bdiesel\b/.test(fuel)) return "diesel";
  if (/\bbensin\b|\bpetrol\b|\bgasoline\b/.test(fuel)) return "bensin";
  if (/\bhybrid\b|\bphev\b|\bmhev\b|\bhev\b|\bplug-?in\b/.test(fuel))
    return "hybrid";
  if (/\bel\b|\belectric\b|\bev\b|\bbev\b/.test(fuel)) return "el";

  if (/\btdi\b/.test(label) || /\bd\b/.test(label)) return "diesel";
  if (/\btsi\b|\btfsi\b|\bfsi\b|\bmpi\b/.test(label)) return "bensin";
  if (/\bhybrid\b|\bphev\b|\bmhev\b|\bhev\b/.test(label)) return "hybrid";
  if (/\belectric\b|\bev\b|\bbev\b|\bel\b/.test(label)) return "el";

  return "other";
};

const groupEnginesByFuel = (engines: Engine[]) => {
  const groups: Record<string, Engine[]> = {};
  engines.forEach((e) => {
    const key = normalizeFuel(e.fuel as any, e.label as any);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
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

export default function YearPage({
  brandData,
  modelData,
  yearData,
}: YearPageProps) {
  const cleanText = (str: string | null | undefined) => {
    if (!str) return "";
    return str
      .replace(/\.\.\./g, "")
      .replace(/\//g, "-")
      .replace(/\s+/g, " ")
      .trim();
  };
  if (!brandData || !modelData || !yearData) {
    return (
      <p className="p-6 text-red-500">
        Ingen information hittades för denna årsmodell.
      </p>
    );
  }

  const modelName = cleanText(formatModelName(brandData.name, modelData.name));
  const pageTitle = cleanText(
    `Motoroptimering för ${brandData.name} ${modelName} ${yearData.range} | AK-Tuning`,
  );
  const pageDescription = `Motoroptimering för ${brandData.name} ${modelName} årsmodell ${yearData.range}. Välj bland ${yearData.engines?.length} för skräddarsydd mjukvara inkl 2 års garanti.`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const yearSlug = getSlug(yearData.slug, yearData.range, true);

  const enginesGrouped = groupEnginesByFuel(yearData.engines || []);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta
          property="og:image"
          content={
            brandData.logo?.asset?.url ||
            "https://tuning.aktuning.se/ak-logo1.png"
          }
        />
        <link
          rel="canonical"
          href={`https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "ProductGroup",
              name: `${brandData.name} ${modelName} ${yearData.range}`,
              brand: {
                "@type": "Brand",
                name: brandData.name,
              },
              model: modelName,
              url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`,
              mainEntityOfPage: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`,
              hasVariant: yearData.engines?.map((engine) => ({
                "@type": "Product",
                name: `Motoroptimering till ${brandData.name} ${modelName} ${yearData.range} ${engine.label}`,
                url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(engine.slug, engine.label)}`,
                image:
                  brandData.logo?.asset?.url ||
                  "https://tuning.aktuning.se/ak-logo1.png",
                description: `Motoroptimering för ${brandData.name} ${modelName} ${yearData.range} ${engine.label}. Upplev mer effekt, högre vridmoment och bättre körglädje med AK-Tuning.`,
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "SEK",
                  availability: "http://schema.org/InStock",
                  url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(engine.slug, engine.label)}`,
                  description: "Bläddra fram din bilmodell för att se pris!",
                },
              })),
            }),
          }}
        />

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
                  name: `Motoroptimering ${brandData.name}`,
                  item: `https://tuning.aktuning.se/${brandSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: modelName,
                  item: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`,
                },
                {
                  "@type": "ListItem",
                  position: 4,
                  name: yearData.range,
                  item: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`,
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
                  name: `Är motoroptimering säkert för ${modelName} ${yearData.range}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Ja, all vår mjukvara är skräddarsydd för din specifik motor och testas noggrant innan och efter optimering. Vi erbjuder 2 års mjukvaru garanti.`,
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
            src="/ak-logo1.png"
            alt="AK-TUNING MOTOROPTIMERING"
            width={110}
            height={120}
            className="h-full object-contain cursor-pointer hover:opacity-90"
            onClick={() => (window.location.href = "/")}
            priority
          />
        </div>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          {brandData.logo?.asset?.url && (
            <img
              src={urlFor(brandData.logo).width(80).url()}
              alt={brandData.logo.alt || brandData.name}
              className="h-10 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-black">
            {cleanText(brandData.name)} {cleanText(modelName)}{" "}
            {cleanText(yearData.range)}
          </h1>
        </div>

        {/* Tillbaka-knapp */}
        <div className="mb-4">
          <Link
            href={`/${brandSlug}/${modelSlug}`}
            className="text-sm text-orange-500 hover:underline"
          >
            ← Tillbaka till {formatModelName(brandData.name, modelData.name)}
          </Link>
        </div>

        {/* Engines grouped by fuel */}
        {["diesel", "bensin", "hybrid", "el", "other"].map((fuelKey) => {
          const engines = enginesGrouped[fuelKey] || [];
          if (!engines.length) return null;

          const heading =
            fuelKey === "diesel"
              ? "Diesel-motorer"
              : fuelKey === "bensin"
                ? "Bensin-motorer"
                : fuelKey === "hybrid"
                  ? "Hybrid-motorer"
                  : fuelKey === "el"
                    ? "El-motorer"
                    : "Övriga motorer";

          const badgeColor =
            fuelKey === "diesel"
              ? "bg-blue-600"
              : fuelKey === "bensin"
                ? "bg-red-600"
                : fuelKey === "hybrid"
                  ? "bg-green-600"
                  : fuelKey === "el"
                    ? "bg-yellow-500"
                    : "bg-gray-500";

          return (
            <div key={fuelKey} className="mb-8">
              <h2 className="text-xl font-bold text-orange-400 mb-4">
                {heading}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {engines.map((engine) => (
                  <Link
                    key={engine._id}
                    href={`/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(
                      engine.slug,
                      engine.label,
                    )}`}
                    className="relative p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
                  >
                    {engine.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {/* SEO Content Section */}
        <section className="bg-gray-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Motoroptimering för {modelName} {yearData.range}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              AK-Tuning erbjuder professionell motoroptimering för {modelName}{" "}
              {yearData.range}.
              <p className="mt-4">
                Välj din motor ovan för att se exakta effektökningar och priser
                för motoroptimering.
              </p>
            </p>
            <h3 className="text-lg font-semibold mt-4">
              Fördelar med {modelName} {yearData.range} optimering:
            </h3>
            <ul className="list-disc list-inside space-y-1">
              <li>Ökad effekt och vridmoment för bättre acceleration</li>
              <li>Förbättrad bränsleekonomi vid normalkörning</li>
              <li>Skräddarsydd mjukvara anpassad för din specifika modell</li>
              <li>2 års garanti på allt vårt arbete</li>
              <li>Professionell diagnostik före och efter optimering</li>
            </ul>
          </div>
        </section>
      </div>
    </>
  );
}

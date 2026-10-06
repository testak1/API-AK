// pages/[brand]/[model]/[year]/index.tsx
import Head from "next/head";
import {GetServerSideProps} from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model, Year, Engine} from "@/types/sanity";
import {buildVehicleOgImageUrl} from "@/lib/ogImage";
import {getModelImageUrl} from "@/lib/server/modelImage";
import VehicleCategoryHero from "@/components/VehicleCategoryHero";
import PublicPageToolbar from "@/components/PublicPageToolbar";
import {usePublicPreferences} from "@/lib/usePublicPreferences";
import {t as translate} from "@/lib/translations";

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
  modelImageUrl: string | null;
}

export const getServerSideProps: GetServerSideProps<
  YearPageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, {brand});
  if (!brandData) return {notFound: true};

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        getSlug(m.slug, m.name).toLowerCase() ===
        getSlug(model, model).toLowerCase()
    ) || null;

  if (!modelData) return {notFound: true};

  const yearData =
    modelData.years?.find(
      (y: Year) =>
        getSlug(y.slug, y.range, true).toLowerCase() ===
        getSlug(year, year, true).toLowerCase()
    ) || null;

  if (!yearData) return {notFound: true};

  const modelImageUrl = await getModelImageUrl(brandData.name, modelData.name);

  return {props: {brandData, modelData, yearData, modelImageUrl}};
};

// --- fuel grouping helpers ---
const normalizeFuel = (
  fuelRaw: string | undefined,
  labelRaw: string | undefined
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
  engines.forEach(e => {
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
  modelImageUrl,
}: YearPageProps) {
  const {
    currentLanguage,
    isDarkTheme,
    toggleTheme,
  } = usePublicPreferences();
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
    `Motoroptimering till ${brandData.name} ${modelName} ${yearData.range} | AK-Tuning`
  );
  const pageDescription = `Motoroptimering till ${brandData.name} ${modelName} årsmodell ${yearData.range}. Välj bland ${yearData.engines?.length} för skräddarsydd mjukvara inkl 2 års garanti.`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const yearSlug = getSlug(yearData.slug, yearData.range, true);
  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}`;
  const imageUrl = buildVehicleOgImageUrl({
    brand: brandData.name,
    model: modelName,
    stage: yearData.range,
  });
  const isVolvoS60 =
    brandData.name.toLowerCase() === "volvo" &&
    modelData.name.toLowerCase() === "s60";
  const engineExamples = Array.from(
    new Set(
      (yearData.engines || [])
        .map(engine => cleanText(engine.label))
        .filter(Boolean),
    ),
  ).slice(0, 8);

  const enginesGrouped = groupEnginesByFuel(yearData.engines || []);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={canonicalUrl} />
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
              hasVariant: yearData.engines?.map(engine => ({
                "@type": "Product",
                name: `Motoroptimering till ${brandData.name} ${modelName} ${yearData.range} ${engine.label}`,
                url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(engine.slug, engine.label)}`,
                image:
                  brandData.logo?.asset?.url ||
                  "https://tuning.aktuning.se/ak-logo1.png",
                description: `Motoroptimering till ${brandData.name} ${modelName} ${yearData.range} ${engine.label}. Upplev mer effekt, högre vridmoment och bättre körglädje med AK-Tuning.`,
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

      <main
        className={`min-h-screen transition-colors ${
          isDarkTheme ? "bg-[#060606] text-white" : "bg-white text-slate-950"
        }`}
      >
        <div className="mx-auto w-full max-w-6xl px-2 p-4 sm:px-4">
        <PublicPageToolbar
          isDarkTheme={isDarkTheme}
          toggleTheme={toggleTheme}
        />
        <VehicleCategoryHero
          eyebrow={`${translate(currentLanguage, "tuningIntro")} ${cleanText(brandData.name)}`}
          heading={`${cleanText(brandData.name)} ${cleanText(modelName)}`}
          description={`${cleanText(yearData.range)} – ${translate(currentLanguage, "selectEngine")}`}
          imageUrl={modelImageUrl}
          imageAlt={`${cleanText(brandData.name)} ${cleanText(modelName)} ${cleanText(yearData.range)}`}
        />
        {/* Tillbaka-knapp */}
        <div className="mb-4">
          {/* Röd länk som matchar loggan med perfekt kontrast */}
          <Link
            href={`/${brandSlug}/${modelSlug}`}
            className={`text-sm font-semibold hover:underline ${
              isDarkTheme
                ? "text-red-400 hover:text-red-300"
                : "text-red-600 hover:text-red-700"
            }`}
          >
            ← {translate(currentLanguage, "BACKTO")} {formatModelName(brandData.name, modelData.name)}
          </Link>
        </div>
        {/* Engines grouped by fuel */}
        {["diesel", "bensin", "hybrid", "el", "other"].map(fuelKey => {
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
          return (
            <div key={fuelKey} className="mb-8">
              {/* Genom att använda text-slate-950 (eller ren text-black) ser det extremt proffsigt ut på vit bakgrund */}
              <h2
                className={`text-xl font-bold mb-4 border-b pb-2 ${
                  isDarkTheme
                    ? "border-zinc-800 text-white"
                    : "border-gray-100 text-slate-900"
                }`}
              >
                {heading}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {engines.map(engine => (
                  <Link
                    key={engine._id}
                    href={`/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(
                      engine.slug,
                      engine.label
                    )}`}
                    className="relative p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow transition-colors"
                  >
                    {engine.label}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
        {/* SEO Content Section */}
        <section
          className={`rounded-lg border p-6 mt-8 ${
            isDarkTheme
              ? "border-zinc-800 bg-zinc-900 text-slate-200"
              : "border-gray-100 bg-gray-50 text-slate-800"
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
            Motoroptimering för {cleanText(modelName)}{" "}
            {cleanText(yearData.range)}
          </h2>
          {isVolvoS60 ? (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                Volvo S60 {cleanText(yearData.range)} kombinerar moderna
                turbomotorer med Geartronic-automat och, beroende på
                motorvariant, framhjulsdrift eller AWD. Optimeringen anpassas
                efter den specifika motorstyrningen och bilens drivlina.
              </p>
              <p className="mt-4">
                Välj motor ovan för att se originaleffekt, optimerad effekt,
                vridmoment och aktuellt pris. För laddhybrider redovisas
                resultatet utifrån den effektdefinition som gäller för den
                aktuella motorvarianten.
              </p>
              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Anpassad optimering för rätt motor
              </h3>
              <p className="mt-2">
                Innan programmeringen identifieras bilens styrenhet och
                mjukvaruversion. Därefter kontrolleras bilen, originalfilen
                sparas och den nya mjukvaran verifieras genom diagnostik och
                loggning.
              </p>
            </div>
          ) : (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                Motoroptimering för {cleanText(brandData.name)}{" "}
                {cleanText(modelName)} {cleanText(yearData.range)} anpassas
                efter den valda motorns styrenhet, originalmjukvara, växellåda
                och drivlina.
              </p>
              <p className="mt-4">
                Välj motor ovan för att se originaleffekt, optimerad effekt,
                vridmoment, tillgängliga steg och aktuellt pris för den
                specifika motorvarianten.
              </p>
              {engineExamples.length > 0 && (
                <p className="mt-4">
                  Motoralternativen för den här generationen omfattar bland
                  annat {engineExamples.join(", ")}.
                </p>
              )}

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Anpassad optimering för rätt motor
              </h3>
              <p className="mt-2">
                Före programmeringen identifieras bilens styrenhet och
                mjukvaruversion. Bilen diagnostiseras, originalfilen sparas och
                resultatet verifieras efter att den anpassade mjukvaran har
                programmerats.
              </p>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Effekt, vridmoment och körbarhet
              </h3>
              <p className="mt-2">
                Målet är högre användbar effekt och ett starkare vridmoment med
                bibehållen körbarhet. Det exakta resultatet beror på motorns
                utförande, mjukvaruversion och bilens tekniska skick.
              </p>
            </div>
          )}
        </section>
        </div>
      </main>
    </>
  );
}

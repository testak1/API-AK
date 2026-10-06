// pages/[brand] / [model] / index.tsx;
import Head from "next/head";
import {GetServerSideProps} from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model, Year} from "@/types/sanity";
import {buildVehicleOgImageUrl} from "@/lib/ogImage";
import {getModelImageUrl} from "@/lib/server/modelImage";
import VehicleCategoryHero from "@/components/VehicleCategoryHero";
import PublicPageToolbar from "@/components/PublicPageToolbar";
import {usePublicPreferences} from "@/lib/usePublicPreferences";
import {t as translate} from "@/lib/translations";

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
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const getSlug = (slug: any, fallback: string, isYear = false) => {
  const val =
    typeof slug === "string" ? slug : slug?.current ? slug.current : fallback;
  return isYear ? slugifyYear(val) : slugifySafe(val);
};

// --- Mercedes modellnamn fix ---
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

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  modelImageUrl: string | null;
}

export const getServerSideProps: GetServerSideProps<
  ModelPageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, {brand});
  if (!brandData) return {notFound: true};

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        getSlug(m.slug, m.name).toLowerCase() ===
          getSlug(model, model).toLowerCase() ||
        m.name.toLowerCase().replace(/\s+/g, "-") ===
          model.toLowerCase().replace(/\s+/g, "-")
    ) || null;

  if (!modelData) return {notFound: true};

  const modelImageUrl = await getModelImageUrl(brandData.name, modelData.name);

  return {props: {brandData, modelData, modelImageUrl}};
};

export default function ModelPage({
  brandData,
  modelData,
  modelImageUrl,
}: ModelPageProps) {
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
  if (!brandData || !modelData) {
    return <p className="p-6 text-red-500">Ingen modell hittades.</p>;
  }

  const modelName = cleanText(formatModelName(brandData.name, modelData.name));
  const pageTitle = cleanText(
    `Motoroptimering till ${brandData.name} ${modelName} | AK-Tuning`
  );
  const pageDescription = `Motoroptimering till ${brandData.name} ${modelName}. Få mer effekt, högre vridmoment och bättre körupplevelse med AK-Tuning.`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`;
  const imageUrl = buildVehicleOgImageUrl({
    brand: brandData.name,
    model: modelName,
  });
  const isVolvoS60OrV60 =
    brandData.name.toLowerCase() === "volvo" &&
    ["s60", "v60"].includes(modelData.name.toLowerCase());
  const modelEngines = (modelData.years || []).flatMap(
    year => year.engines || [],
  );
  const engineExamples = Array.from(
    new Set(modelEngines.map(engine => cleanText(engine.label)).filter(Boolean)),
  ).slice(0, 7);
  const yearExamples = (modelData.years || [])
    .map(year => cleanText(year.range))
    .filter(Boolean)
    .slice(0, 5);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
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
              "@graph": [
                {
                  "@type": "ProductModel",
                  name: `${brandData.name} ${modelData.name}`,
                  brand: {
                    "@type": "Brand",
                    name: brandData.name,
                  },
                  image:
                    brandData.logo?.asset?.url ||
                    "https://tuning.aktuning.se/ak-logo1.png",
                  url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`,
                  mainEntityOfPage: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`,
                },
                {
                  "@type": "ItemList",
                  name: `Motoroptimering till ${brandData.name} ${modelData.name} årsmodeller`,
                  itemListElement: modelData.years?.map((year, index) => ({
                    "@type": "ListItem",
                    position: index + 1,
                    url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${getSlug(year.slug, year.range, true)}`,
                    name: year.range,
                  })),
                },
              ],
            }),
          }}
        />
        {/* FAQ Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: [
                {
                  "@type": "Question",
                  name: `Vilka årsmodeller av ${modelName} kan optimeras?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Vi erbjuder motoroptimering för ${modelName} från ${modelData.years?.[0]?.range || ""} till ${modelData.years?.[modelData.years.length - 1]?.range || ""}.`,
                  },
                },
                {
                  "@type": "Question",
                  name: `Vad kan jag förvänta mig av motoroptimering för ${modelName}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Typiska resultat är 20-40% effektökning, 15-35% vridmomsökning och upp till 15% bättre bränsleekonomi. Exakta siffror varierar beroende på motor och årsmodell. Välj din modell och motor för att se effekt samt prisuppgifter.`,
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
          description={translate(currentLanguage, "selectYear")}
          imageUrl={modelImageUrl}
          imageAlt={`${cleanText(brandData.name)} ${cleanText(modelName)}`}
        />
        {/* Tillbaka-knapp */}
        <div className="mb-4">
          {/* Röd länk som matchar loggan med perfekt kontrast */}
          <Link
            href={`/${brandSlug}`}
            className={`text-sm font-semibold hover:underline ${
              isDarkTheme
                ? "text-red-400 hover:text-red-300"
                : "text-red-600 hover:text-red-700"
            }`}
          >
            ← {translate(currentLanguage, "BACKTO")} {brandData.name}
          </Link>
        </div>
        {/* Lista år */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {modelData.years?.map((year: Year) => (
            <Link
              key={year._id}
              href={`/${brandSlug}/${modelSlug}/${getSlug(
                year.slug,
                year.range,
                true
              )}`}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow transition-colors"
            >
              {year.range}
            </Link>
          ))}
        </div>
        {/* SEO Content Section */}
        <section
          className={`rounded-lg border p-6 mt-8 ${
            isDarkTheme
              ? "border-zinc-800 bg-zinc-900 text-slate-200"
              : "border-gray-100 bg-gray-50 text-slate-800"
          }`}
        >
          <h2 className={`text-xl font-bold mb-4 ${isDarkTheme ? "text-white" : "text-slate-900"}`}>
            Motoroptimering för {cleanText(brandData.name)}{" "}
            {cleanText(modelName)}
          </h2>
          {isVolvoS60OrV60 ? (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                Volvo {cleanText(modelName)} finns med flera generationer av
                diesel-, bensin- och laddhybriddrivlinor. Bland de vanligaste
                alternativen finns D3, D4, D5, T4, T5, T6 och Recharge.
              </p>
              <p className="mt-4">
                Vid optimering av en Volvo {cleanText(modelName)} anpassas
                vridmomentet efter bilens motor, Geartronic-växellåda och
                eventuell AWD-drivlina. Målet är en starkare och jämnare
                kraftleverans med bibehållen körbarhet.
              </p>
              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Välj rätt generation och motor
              </h3>
              <p className="mt-2">
                Välj årsmodell ovan för att se de motoralternativ som finns för
                just din {cleanText(modelName)}. På motorsidan visas
                originaleffekt, optimerad effekt, vridmoment, tillgängliga steg
                och aktuellt pris.
              </p>
              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Volvo {cleanText(modelName)} Recharge
              </h3>
              <p className="mt-2">
                För laddhybrider beror resultatet på bilens motorstyrning och
                mjukvaruversion. Den angivna effekten kan avse bensinmotorn
                eller hela hybridsystemet, vilket redovisas på den specifika
                motorsidan.
              </p>
            </div>
          ) : (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                {cleanText(brandData.name)} {cleanText(modelName)} finns i
                flera generationer och motoralternativ. AK-TUNING anpassar
                motoroptimeringen efter bilens motorstyrning, mjukvaruversion,
                växellåda och drivlina.
              </p>
              <p className="mt-4">
                Välj rätt årsmodell ovan för att se motorerna som är
                tillgängliga för just din {cleanText(modelName)}. Där visas
                originaleffekt, optimerad effekt, vridmoment, tillgängliga steg
                och aktuellt pris.
              </p>
              {yearExamples.length > 0 && (
                <p className="mt-4">
                  Tillgängliga generationer och perioder omfattar bland annat{" "}
                  {yearExamples.join(", ")}.
                </p>
              )}

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Välj rätt generation och motor
              </h3>
              <p className="mt-2">
                Samma modellnamn kan omfatta flera generationer med olika
                styrenheter och motorer. Årsmodell och motorbeteckning behöver
                därför stämma innan effektökningen kan anges.
              </p>
              {engineExamples.length > 0 && (
                <p className="mt-4">
                  Exempel på motoralternativ för {cleanText(modelName)} är{" "}
                  {engineExamples.join(", ")}.
                </p>
              )}

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Anpassad för växellåda och drivlina
              </h3>
              <p className="mt-2">
                Vridmomentet anpassas efter bilens växellåda och drivning för
                en jämnare kraftleverans. Diagnostik utförs före och efter
                programmeringen och originalfilen sparas alltid.
              </p>
            </div>
          )}
        </section>
        </div>
      </main>
    </>
  );
}

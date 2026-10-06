// pages/[brand]/index.tsx
import Head from "next/head";
import {GetServerSideProps} from "next";
import Link from "next/link";
import {useRouter} from "next/router";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model} from "@/types/sanity";
import {buildVehicleOgImageUrl} from "@/lib/ogImage";
import VehicleCategoryHero from "@/components/VehicleCategoryHero";
import PublicPageToolbar from "@/components/PublicPageToolbar";
import {usePublicPreferences} from "@/lib/usePublicPreferences";
import {t as translate} from "@/lib/translations";
import {getBrandLogoUrl} from "@/lib/brandLogo";
import {getRepresentativeEngines} from "@/lib/seoEngineExamples";

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

interface BrandPageProps {
  brandData: Brand | null;
}

const getSlug = (slug: any, fallback: string) => {
  const val =
    typeof slug === "string" ? slug : slug?.current ? slug.current : fallback;
  return slugifySafe(val);
};

// Hjälpfunktion för Mercedes-modeller
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

export const getServerSideProps: GetServerSideProps<
  BrandPageProps
> = async context => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, {brand});

  if (!brandData) return {notFound: true};

  return {props: {brandData}};
};

export default function BrandPage({brandData}: BrandPageProps) {
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
  const router = useRouter();
  if (!brandData) {
    return <p className="p-6 text-red-500">Ingen tillverkare hittades.</p>;
  }

  const brandName = cleanText(brandData.name);
  const pageTitle = cleanText(`Motoroptimering till ${brandName} | AK-Tuning`);
  const pageDescription = `Motoroptimering till ${brandName}. ✅ Effektökning ✅ Bränslebesparing ✅ 2 års garanti. Välj modell och upplev skillnaden!`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}`;
  const brandLogoUrl = getBrandLogoUrl(brandSlug);
  const imageUrl = buildVehicleOgImageUrl({brand: brandName});
  const isVolvo = brandName.toLowerCase() === "volvo";
  const isTruckBrand = brandSlug.startsWith("lastbil-");
  const modelExamples = (brandData.models || [])
    .map(model => cleanText(formatModelName(brandData.name, model.name)))
    .filter(Boolean)
    .slice(0, 6);
  const brandEngines = (brandData.models || []).flatMap(model =>
    (model.years || []).flatMap(year => year.engines || []),
  );
  const engineExamples = getRepresentativeEngines(brandEngines);
  const fuelExamples = Array.from(
    new Set(
      brandEngines
        .map(engine => cleanText(engine.fuel))
        .filter(Boolean)
        .map(fuel => fuel.toLowerCase()),
    ),
  )
    .filter(fuel => !fuel.includes("hybrid") && fuel !== "el")
    .slice(0, 4);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={imageUrl} />
        <meta property="og:image:type" content="image/png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />

        {/* Canonical */}
        <link rel="canonical" href={canonicalUrl} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebPage",
                  "@id": `${canonicalUrl}#webpage`,
                  url: canonicalUrl,
                  name: pageTitle,
                  description: pageDescription,
                  breadcrumb: {
                    "@id": `${canonicalUrl}#breadcrumb`,
                  },
                  inLanguage: "sv-SE",
                },
                {
                  "@type": "BreadcrumbList",
                  "@id": `${canonicalUrl}#breadcrumb`,
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
                      name: `Motoroptimering ${brandName}`,
                      item: canonicalUrl,
                    },
                  ],
                },
                {
                  "@type": "Brand",
                  name: brandName,
                  description: `Motoroptimering och ECU-programmering för ${brandName}`,
                  logo: brandLogoUrl,
                  url: canonicalUrl,
                  mainEntityOfPage: canonicalUrl,
                },
                {
                  "@type": "ItemList",
                  name: `Modeller av ${brandName} för motoroptimering`,
                  description: `Välj modell för att se motoroptimering möjligheter för ${brandName}`,
                  numberOfItems: brandData.models?.length || 0,
                  itemListElement:
                    brandData.models?.map((model, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      item: {
                        "@type": "ProductModel",
                        name: formatModelName(brandName, model.name),
                        url: `https://tuning.aktuning.se/${brandSlug}/${getSlug(model.slug, model.name)}`,
                        brand: {
                          "@type": "Brand",
                          name: brandName,
                        },
                      },
                    })) || [],
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
                  name: `Vad kostar motoroptimering för ${brandName}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Bläddra fram din bilmodell och motor för exakt pris och effektuppgifter.`,
                  },
                },
                {
                  "@type": "Question",
                  name: `Är motoroptimering säkert för min ${brandName}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Ja, alla mjukvaror är skräddarsydda och anpassade utifrån bilens originalfil som grund, med hög fokus på driftsäkerhet. Alla våra tjänster omfattas av 2 års garanti.`,
                  },
                },
                {
                  "@type": "Question",
                  name: `Förbättras bränsleekonomin efter motoroptimering av ${brandName}?`,
                  acceptedAnswer: {
                    "@type": "Answer",
                    text: `Ja, de flesta kunder upplever en bränslebesparing mellan 5-15% vid normalt körningsmönster, tack vare optimerad förbränning och effektivare kraftöverföring.`,
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
          eyebrow={translate(currentLanguage, "tuningIntro")}
          heading={brandName}
          description={`${translate(currentLanguage, "selectModel")}: ${brandName}`}
          imageUrl={brandLogoUrl}
          imageAlt={brandData.logo?.alt || `${brandName} logotyp`}
        />
        {/* Tillbaka-knapp */}
        <div className="mb-4">
          {/* Röd länk som matchar loggan med perfekt kontrast */}
          <Link
            href="/"
            className={`text-sm font-semibold hover:underline ${
              isDarkTheme
                ? "text-red-400 hover:text-red-300"
                : "text-red-600 hover:text-red-700"
            }`}
          >
            ← {translate(currentLanguage, "backtostart")}
          </Link>
        </div>
        {/* Lista modeller */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {brandData.models?.map((model: Model) => (
            <Link
              key={model._id}
              href={`/${brandSlug}/${getSlug(model.slug, model.name)}`}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow transition-colors"
            >
              {formatModelName(brandData.name, model.name)}
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
          <h2
            className={`text-xl font-bold mb-4 ${
              isDarkTheme ? "text-white" : "text-slate-900"
            }`}
          >
            Motoroptimering för {brandName}
          </h2>
          {isVolvo ? (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                Volvo har ett stort urval av bensin-, diesel- och
                laddhybridmotorer där förutsättningarna för motoroptimering
                varierar mellan modell, motorstyrning och årsmodell. Hos
                AK-TUNING anpassas mjukvaran efter bilens specifika drivlina –
                från D3-, D4- och D5-motorer till T5-, T6- och
                Recharge-modeller.
              </p>
              <p className="mt-4">
                Välj din Volvo-modell ovan för att se tillgängliga motorer,
                originaleffekt, optimerad effekt och aktuellt pris.
              </p>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Vanliga Volvo-motorer vi optimerar
              </h3>
              <p className="mt-2">
                Volvos dieselmotorer D3, D4 och D5 kan få ett starkare och
                jämnare vridmoment, vilket märks vid acceleration, omkörning
                och körning med släp. På bensinsidan anpassas optimeringen av
                bland annat T4, T5 och T6 efter motor, turbosystem och bilens
                växellåda.
              </p>
              <p className="mt-4">
                På laddhybrider och Recharge-modeller behöver både
                förbränningsmotorn och bilens angivna systemeffekt hanteras
                korrekt. Därför redovisas resultatet separat för den aktuella
                motorvarianten.
              </p>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Geartronic, AWD och drivlina
              </h3>
              <p className="mt-2">
                Många Volvo-modeller har Geartronic-automat och fyrhjulsdrift.
                Vridmomentet anpassas därför efter växellådans och drivlinans
                förutsättningar. För vissa modeller kan även en separat
                växellådsoptimering vara aktuell.
              </p>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Så går motoroptimeringen till
              </h3>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Bilens motor, styrenhet och mjukvaruversion identifieras.</li>
                <li>Diagnostik och kontroll av eventuella felkoder genomförs.</li>
                <li>Originalmjukvaran läses ut och sparas.</li>
                <li>Mjukvaran anpassas efter motorn och drivlinan.</li>
                <li>Bilen loggas och kontrolleras efter programmeringen.</li>
              </ol>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Hitta rätt effekt och pris
              </h3>
              <p className="mt-2">
                Effektökningen beror på motorvariant, årsmodell,
                mjukvaruversion och bilens tekniska skick. På respektive
                motorsida visas originaleffekt, förväntad effekt efter
                optimering, vridmoment, tillgängliga steg och aktuellt pris.
                AK-TUNING finns genom stationer och återförsäljare i bland
                annat Göteborg, Stockholm, Skåne, Jönköping, Örebro och Växjö.
              </p>
            </div>
          ) : (
            <div className={`prose max-w-none ${isDarkTheme ? "prose-invert" : "prose-gray"}`}>
              <p>
                AK-TUNING erbjuder professionell motoroptimering för {brandName}.
                Mjukvaran anpassas efter bilens motor, styrenhet, årsmodell och
                drivlina i stället för att använda en generell standardfil.
              </p>
              {modelExamples.length > 0 && (
                <p className="mt-4">
                  I vårt utbud finns bland annat {modelExamples.join(", ")}.
                  Välj modell för att gå vidare till rätt generation och
                  motoralternativ.
                </p>
              )}
              <p className="mt-4">
                Välj din {brandName}-modell ovan för att se tillgängliga
                motorer, originaleffekt, optimerad effekt, vridmoment och
                aktuellt pris.
              </p>

              {!isTruckBrand && (
                <>
              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Bensin, diesel och elektrifierade drivlinor
              </h3>
              <p className="mt-2">
                Förutsättningarna varierar mellan turbobensin, diesel,
                mildhybrid och laddhybrid. Därför bedöms varje motorvariant
                separat. På elektrifierade modeller anges det tydligt om
                effekten avser förbränningsmotorn eller bilens totala
                systemeffekt.
              </p>
              {(engineExamples.length > 0 || fuelExamples.length > 0) && (
                <p className="mt-4">
                  {fuelExamples.length > 0 &&
                    `Bränsletyper i ${brandName}-utbudet omfattar ${fuelExamples.join(", ")}. `}
                  {engineExamples.length > 0 &&
                    `Exempel på motoralternativ är ${engineExamples.join(", ")}.`}
                </p>
              )}

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Växellåda och drivlina
              </h3>
              <p className="mt-2">
                Vridmomentet anpassas efter bilens manuella eller automatiska
                växellåda samt framhjuls-, bakhjuls- eller fyrhjulsdrift. Det
                ger en jämn kraftleverans och tar hänsyn till drivlinans
                tekniska begränsningar.
              </p>
                </>
              )}

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Så går motoroptimeringen till
              </h3>
              <ol className="list-decimal list-inside space-y-1 mt-2">
                <li>Motor, styrenhet och mjukvaruversion identifieras.</li>
                <li>Diagnostik och kontroll av felkoder genomförs.</li>
                <li>Bilens originalmjukvara läses ut och sparas.</li>
                <li>Mjukvaran anpassas efter motorn och drivlinan.</li>
                <li>Bilen kontrolleras och verifieras efter programmeringen.</li>
              </ol>

              <h3 className={`text-lg font-semibold mt-6 ${isDarkTheme ? "text-white" : "text-slate-800"}`}>
                Hitta rätt effekt och pris för {brandName}
              </h3>
              <p className="mt-2">
                Resultatet beror på motorvariant, årsmodell, mjukvaruversion
                och fordonets tekniska skick. Välj modell och motor för att se
                de uppgifter som gäller för just ditt fordon. Alla våra
                motoroptimeringar omfattas av 2 års mjukvarugaranti.
              </p>
            </div>
          )}
        </section>
        </div>
      </main>
    </>
  );
}

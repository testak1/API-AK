// pages/[brand]/index.tsx
import Head from "next/head";
import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import NextImage from "next/image";

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

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) return { notFound: true };

  return { props: { brandData } };
};

export default function BrandPage({ brandData }: BrandPageProps) {
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
  const pageTitle = cleanText(`Motoroptimering ${brandName} | AK-Tuning`);
  const pageDescription = `Motoroptimering för ${brandName}. ✅ Effektökning ✅ Bränslebesparing ✅ 2 års garanti. Välj modell och upplev skillnaden!`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}`;
  const imageUrl =
    brandData.logo?.asset?.url || "https://tuning.aktuning.se/ak-logo1.png";

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`Motoroptimering ${brandData.name} | AK-TUNING`}
        />
        <meta
          property="og:description"
          content={`Upptäck motoroptimering för ${brandData.name}. Välj modell och få rätt effektökning och bränslebesparing med AK-TUNING.`}
        />
        <meta
          property="og:image"
          content={
            brandData.logo?.asset?.url ||
            "https://tuning.aktuning.se/ak-logo1.png"
          }
        />

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
                  logo: imageUrl,
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
        {/* Header med logga */}
        <div className="flex items-center gap-4 mb-6">
          {brandData.logo?.asset && (
            <img
              src={urlFor(brandData.logo).width(80).url()}
              alt={brandData.logo.alt || brandData.name}
              className="h-10 object-contain"
            />
          )}
          <h1 className="text-2xl font-bold text-black">
            {cleanText(brandData.name)}
          </h1>
        </div>

        {/* Tillbaka-knapp */}
        <div className="mb-4">
          <Link href="/" className="text-sm text-orange-500 hover:underline">
            ← Tillbaka till startsidan
          </Link>
        </div>

        {/* Lista modeller */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {brandData.models?.map((model: Model) => (
            <Link
              key={model._id}
              href={`/${brandSlug}/${getSlug(model.slug, model.name)}`}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
            >
              {formatModelName(brandData.name, model.name)}
            </Link>
          ))}
        </div>

        {/* SEO Content Section */}
        <section className="bg-gray-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Motoroptimering för {brandName}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              AK-Tuning erbjuder professionell motoroptimering för {brandName}.
              <p className="mt-4">
                Välj din {brandName} modell ovan för att se exakta
                effektökningar och priser för motoroptimering.
              </p>
            </p>
            <h3 className="text-lg font-semibold mt-4">
              Fördelar med {brandName} optimering:
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

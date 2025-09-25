// pages/[brand]/[model]/index.tsx
import Head from "next/head";
import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year } from "@/types/sanity";
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
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");

  const brandData = await client.fetch(brandBySlugQuery, { brand });
  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        getSlug(m.slug, m.name).toLowerCase() ===
          getSlug(model, model).toLowerCase() ||
        m.name.toLowerCase().replace(/\s+/g, "-") ===
          model.toLowerCase().replace(/\s+/g, "-"),
    ) || null;

  if (!modelData) return { notFound: true };

  return { props: { brandData, modelData } };
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  if (!brandData || !modelData) {
    return <p className="p-6 text-red-500">Ingen modell hittades.</p>;
  }

  const brandName = brandData.name;
  const yearRange =
    modelData.years && modelData.years.length > 0
      ? `${modelData.years[0].range} - ${modelData.years[modelData.years.length - 1].range}`
      : "";

  const modelName = formatModelName(brandData.name, modelData.name);
  const pageTitle = `Motoroptimering för ${brandData.name} ${modelName} | AK-Tuning`;
  const pageDescription = `Motoroptimering för ${brandData.name} ${modelName}. Få mer effekt, högre vridmoment och bättre körupplevelse med AK-Tuning.`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const canonicalUrl = `https://tuning.aktuning.se/${brandSlug}/${modelSlug}`;

  const imageUrl =
    brandData.logo?.asset?.url || "https://tuning.aktuning.se/ak-logo1.png";

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
                  isPartOf: {
                    "@id": "https://tuning.aktuning.se/#website",
                  },
                  breadcrumb: {
                    "@id": `${canonicalUrl}#breadcrumb`,
                  },
                  inLanguage: "sv-SE",
                  potentialAction: [
                    {
                      "@type": "ReadAction",
                      target: [canonicalUrl],
                    },
                  ],
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
                      name: brandName,
                      item: `https://tuning.aktuning.se/${brandSlug}`,
                    },
                    {
                      "@type": "ListItem",
                      position: 3,
                      name: modelName,
                      item: canonicalUrl,
                    },
                  ],
                },
                {
                  "@type": "ProductModel",
                  name: `${brandName} ${modelName}`,
                  model: modelName,
                  brand: {
                    "@type": "Brand",
                    name: brandName,
                    logo: imageUrl,
                  },
                  description: `Motoroptimering och ECU-programmering för ${brandName} ${modelName}`,
                  url: canonicalUrl,
                  productionDate: yearRange,
                },
                {
                  "@type": "ItemList",
                  name: `Årsmodeller av ${brandName} ${modelName} för motoroptimering`,
                  description: `Välj årsmodell för att se motoroptimering möjligheter för ${brandName} ${modelName}`,
                  numberOfItems: modelData.years?.length || 0,
                  itemListElement:
                    modelData.years?.map((year, index) => ({
                      "@type": "ListItem",
                      position: index + 1,
                      item: {
                        "@type": "Product",
                        name: `${brandName} ${modelName} ${year.range}`,
                        url: `https://tuning.aktuning.se/${brandSlug}/${modelSlug}/${getSlug(year.slug, year.range, true)}`,
                        model: modelName,
                        brand: {
                          "@type": "Brand",
                          name: brandName,
                        },
                        releaseDate: year.range,
                      },
                    })) || [],
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
            {brandData.name} {formatModelName(brandData.name, modelData.name)}
          </h1>
        </div>

        {/* Tillbaka-knapp */}
        <div className="mb-4">
          <Link
            href={`/${brandSlug}`}
            className="text-sm text-orange-500 hover:underline"
          >
            ← Tillbaka till {brandData.name}
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
                true,
              )}`}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
            >
              {year.range}
            </Link>
          ))}
        </div>

        {/* SEO Content Section */}
        <section className="bg-gray-50 rounded-lg p-6 mt-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Motoroptimering för {brandName} {modelName}
          </h2>
          <div className="prose prose-gray max-w-none">
            <p>
              AK-Tuning erbjuder professionell motoroptimering för {brandName}{" "}
              {modelName}.
              <p className="mt-4">
                Välj din {modelName} modell ovan för att se exakta
                effektökningar och priser för motoroptimering.
              </p>
            </p>
            <h3 className="text-lg font-semibold mt-4">
              Fördelar med {brandName} {modelName} optimering:
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

// pages/[brand]/[model]/index.tsx
import Head from "next/head";
import {GetServerSideProps} from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model, Year} from "@/types/sanity";
import {urlFor} from "@/lib/sanity";
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

  return {props: {brandData, modelData}};
};

export default function ModelPage({brandData, modelData}: ModelPageProps) {
  if (!brandData || !modelData) {
    return <p className="p-6 text-red-500">Ingen modell hittades.</p>;
  }

  const modelName = formatModelName(brandData.name, modelData.name);
  const pageTitle = `${brandData.name} ${modelName} Motoroptimering | AK-Tuning`;
  const pageDescription = `Motoroptimering för ${brandData.name} ${modelName}. Få mer effekt, högre vridmoment och bättre körupplevelse med AK-Tuning.`;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link
          rel="canonical"
          href={`https://tuning.aktuning.se/${brandSlug}/${modelSlug}`}
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
                true
              )}`}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
            >
              {year.range}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

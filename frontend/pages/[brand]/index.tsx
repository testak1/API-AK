// pages/[brand]/index.tsx
import Head from "next/head";
import {GetServerSideProps} from "next";
import Link from "next/link";
import {useRouter} from "next/router";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model} from "@/types/sanity";
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
  const router = useRouter();

  const brandName = brandData.name;
  const pageTitle = `${brandName} Motoroptimering | AK-Tuning`;
  const pageDescription = `Motoroptimering för ${brandName}. Mer effekt, högre vridmoment och bättre körglädje. | AK-Tuning`;

  if (!brandData) {
    return <p className="p-6 text-red-500">Ingen tillverkare hittades.</p>;
  }

  const brandSlug = getSlug(brandData.slug, brandData.name);

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
          property="og:url"
          content={`https://tuning.aktuning.se/${brandData.slug?.current || brandName}`}
        />
        <meta property="og:image" content="/ak-logo1.png" />

        {/* Canonical */}
        <link
          rel="canonical"
          href={`https://tuning.aktuning.se/${brandData.slug?.current || brandName}`}
        />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Brand",
              name: brandData.name,
              logo:
                brandData.logo?.asset?.url ||
                "https://tuning.aktuning.se/ak-logo1.png",
              url: `https://tuning.aktuning.se/${brandSlug}`,
              mainEntityOfPage: `https://tuning.aktuning.se/${brandSlug}`,
              itemListElement: brandData.models?.map((model, index) => ({
                "@type": "ListItem",
                position: index + 1,
                url: `https://tuning.aktuning.se/${brandSlug}/${getSlug(model.slug, model.name)}`,
                name: model.name,
              })),
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
          <h1 className="text-2xl font-bold text-black">{brandData.name}</h1>
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
      </div>
    </>
  );
}

// pages/[brand]/index.tsx
import {GetServerSideProps} from "next";
import Link from "next/link";
import {useRouter} from "next/router";
import client from "@/lib/sanity";
import {brandBySlugQuery} from "@/src/lib/queries";
import {Brand, Model} from "@/types/sanity";
import {urlFor} from "@/lib/sanity";
import NextImage from "next/image";
import {useState} from "react";
import {t as translate} from "@/lib/translations";
import PublicLanguageDropdown from "@/components/PublicLanguageSwitcher";

interface BrandPageProps {
  brandData: Brand | null;
}

const getSlug = (slug: any, fallback: string) => {
  if (!slug) return fallback;
  return typeof slug === "string" ? slug : slug.current || fallback;
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
  const [currentLanguage, setCurrentLanguage] = useState("sv");
  const router = useRouter();

  if (!brandData) {
    return <p className="p-6 text-red-500">Ingen tillverkare hittades.</p>;
  }

  const brandSlug = getSlug(brandData.slug, brandData.name);

  const storedLang = localStorage.getItem("lang");
  if (storedLang) {
    setCurrentLanguage(storedLang);
  }

  return (
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
          ← {translate(currentLanguage, "backtostart")}
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
  );
}

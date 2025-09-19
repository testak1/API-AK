// pages/[brand]/[model]/index.tsx
import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
}

const getSlug = (slug: any, fallback: string) => {
  if (!slug) return fallback;
  return typeof slug === "string" ? slug : slug.current || fallback;
};

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
        m.name.toLowerCase().replace(/\s+/g, "-") ===
          model.toLowerCase().replace(/\s+/g, "-") ||
        getSlug(m.slug, m.name).toLowerCase() === model.toLowerCase(),
    ) || null;

  if (!modelData) return { notFound: true };

  return { props: { brandData, modelData } };
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  const router = useRouter();

  if (!brandData || !modelData) {
    return <p className="p-6 text-red-500">Ingen modell hittades.</p>;
  }

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Tillbaka-knapp */}
      <div className="mb-4">
        <button
          onClick={() => router.back()}
          className="text-sm text-orange-500 hover:underline"
        >
          ← Tillbaka till {brandData.name}
        </button>
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
        <h1 className="text-2xl font-bold text-white">
          {brandData.name} {modelData.name}
        </h1>
      </div>

      {/* Lista år */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {modelData.years?.map((year: Year) => (
          <Link
            key={year._id}
            href={`/${brandSlug}/${modelSlug}/${getSlug(year.slug, year.range)}`}
            className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
          >
            {year.range}
          </Link>
        ))}
      </div>
    </div>
  );
}

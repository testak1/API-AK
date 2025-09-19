// pages/[brand]/[model]/[year]/index.tsx
import { GetServerSideProps } from "next";
import Link from "next/link";
import { useRouter } from "next/router";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year, Engine } from "@/types/sanity";
import { urlFor } from "@/lib/sanity";
import slugify from "slugify";

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

const getSlug = (slug: any, fallback: string) => {
  if (!slug) return fallback;
  return typeof slug === "string" ? slug : slug.current || fallback;
};

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
        getSlug(m.slug, m.name).toLowerCase() === model.toLowerCase(),
    ) || null;

  if (!modelData) return { notFound: true };

  const yearData =
    modelData.years?.find(
      (y: Year) =>
        getSlug(y.slug, y.range).toLowerCase() === year.toLowerCase(),
    ) || null;

  if (!yearData) return { notFound: true };

  return {
    props: {
      brandData,
      modelData,
      yearData,
    },
  };
};

export default function YearPage({
  brandData,
  modelData,
  yearData,
}: YearPageProps) {
  const router = useRouter();

  if (!brandData || !modelData || !yearData) {
    return (
      <p className="p-6 text-red-500">
        Ingen information hittades för denna årsmodell.
      </p>
    );
  }

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const yearSlug = getSlug(yearData.slug, yearData.range);

  // Gruppindelning av motorer
  const groupEnginesByFuel = (engines: Engine[]) => {
    const groups: Record<string, Engine[]> = {};
    engines.forEach((engine) => {
      const fuel = engine.fuel?.toLowerCase() || "other";
      if (!groups[fuel]) groups[fuel] = [];
      groups[fuel].push(engine);
    });
    return groups;
  };

  const enginesGrouped = groupEnginesByFuel(yearData.engines || []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Back button */}
      <div className="mb-4">
        <Link
          href={`/${brandSlug}/${modelSlug}`}
          className="text-sm text-orange-500 hover:underline"
        >
          ← Tillbaka till {modelData.name}
        </Link>
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
        <h1 className="text-2xl font-bold text-white">
          {brandData.name} {modelData.name} {yearData.range}
        </h1>
      </div>

      {/* Engines grouped by fuel */}
      {Object.entries(enginesGrouped).map(([fuel, engines]) => (
        <div key={fuel} className="mb-8">
          <h2 className="text-xl font-bold text-orange-400 mb-4">
            {fuel === "diesel" && "Diesel-motorer"}
            {fuel === "bensin" && "Bensin-motorer"}
            {fuel === "hybrid" && "Hybrid-motorer"}
            {fuel === "el" && "El-motorer"}
            {fuel === "other" && "Övriga motorer"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {engines.map((engine) => (
              <Link
                key={engine._id}
                href={`/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(engine.slug, engine.label)}`}
                className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
              >
                {engine.label}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

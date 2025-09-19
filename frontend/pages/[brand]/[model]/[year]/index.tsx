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

const slugifySafe = (str: string) => {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\//g, "-") // ersätt "/" med "-"
    .replace(/\s+/g, "-") // ersätt mellanslag med "-"
    .replace(/[^a-z0-9\-]/g, "") // ta bort allt som inte är a-z, 0-9 eller "-"
    .replace(/-+/g, "-"); // slå ihop flera bindestreck
};

const getSlug = (slug: any, fallback: string) => {
  const val =
    typeof slug === "string" ? slug : slug?.current ? slug.current : fallback;

  return slugifySafe(val);
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

// Normalisera bränsle (fallback till label om fuel saknas)
const normalizeFuel = (
  fuelRaw: string | undefined,
  labelRaw: string | undefined,
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
  engines.forEach((e) => {
    const key = normalizeFuel(e.fuel as any, e.label as any);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });
  return groups;
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

  const enginesGrouped = groupEnginesByFuel(yearData.engines || []);

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Tillbaka-knapp */}
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
      {["diesel", "bensin", "hybrid", "el", "other"].map((fuelKey) => {
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

        const badgeColor =
          fuelKey === "diesel"
            ? "bg-blue-600"
            : fuelKey === "bensin"
              ? "bg-red-600"
              : fuelKey === "hybrid"
                ? "bg-green-600"
                : fuelKey === "el"
                  ? "bg-yellow-500"
                  : "bg-gray-500";

        return (
          <div key={fuelKey} className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              {brandData.logo?.asset?.url && (
                <img
                  src={urlFor(brandData.logo).width(80).url()}
                  alt={brandData.logo.alt || brandData.name}
                  className="h-10 object-contain"
                />
              )}
            </div>
            <h2 className="text-xl font-bold text-orange-400 mb-4">
              {heading}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {engines.map((engine) => (
                <Link
                  key={engine._id}
                  href={`/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(
                    engine.slug,
                    engine.label,
                  )}`}
                  className="relative p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-center text-white font-medium shadow"
                >
                  {/* Fuel badge */}
                  <span
                    className={`absolute top-2 right-2 text-xs px-2 py-1 rounded-full ${badgeColor}`}
                  >
                    {heading.replace("-motorer", "")}
                  </span>
                  {engine.label}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

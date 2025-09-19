import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year } from "@/types/sanity";

// Helper för slug
const getSlug = (slug: any, fallback: string) => {
  if (!slug) return fallback;
  return typeof slug === "string" ? slug : slug.current || fallback;
};

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

export const getServerSideProps: GetServerSideProps<YearPageProps> = async (
  context,
) => {
  const brand = context.params?.brand as string;
  const model = context.params?.model as string;
  const year = context.params?.year as string;

  const brandData = await client.fetch(brandBySlugQuery, { brand });
  const modelData =
    brandData?.models?.find((m: any) => getSlug(m.slug, m.name) === model) ||
    null;
  const yearData =
    modelData?.years?.find((y: any) => getSlug(y.slug, y.range) === year) ||
    null;

  if (!brandData || !modelData || !yearData) {
    return { notFound: true };
  }

  return { props: { brandData, modelData, yearData } };
};

export default function YearPage({
  brandData,
  modelData,
  yearData,
}: YearPageProps) {
  if (!brandData || !modelData || !yearData) return <p>Ingen data</p>;

  const brandSlug = getSlug(brandData.slug, brandData.name);
  const modelSlug = getSlug(modelData.slug, modelData.name);
  const yearSlug = getSlug(yearData.slug, yearData.range);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
      {/* Brand logo */}
      <div className="flex items-center justify-between mb-4">
        {brandData.logo?.asset?.url && (
          <img
            src={brandData.logo.asset.url}
            alt={brandData.logo?.alt || brandData.name}
            className="h-12 w-auto object-contain"
          />
        )}
      </div>

      {/* Back button */}
      <div className="mb-6">
        <Link
          href={`/${brandSlug}/${modelSlug}`}
          className="text-sm text-orange-500 hover:underline"
        >
          ← Tillbaka till {modelData.name}
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-center">
        {brandData.name} {modelData.name} {yearData.range}
      </h1>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {yearData.engines?.map((engine) => (
          <li
            key={engine._id}
            className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700"
          >
            <Link
              href={`/${brandSlug}/${modelSlug}/${yearSlug}/${getSlug(engine.slug, engine.label)}`}
              className="block text-center text-white font-medium"
            >
              {engine.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

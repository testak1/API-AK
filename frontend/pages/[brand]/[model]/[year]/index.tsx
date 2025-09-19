// pages/[brand]/[model]/[year]/index.tsx
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year, Engine } from "@/types/sanity";
import Link from "next/link";
import { useRouter } from "next/router";
import slugify from "slugify";

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

  try {
    const brandData = await client.fetch(brandBySlugQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return { notFound: true };

    const modelData =
      brandData.models?.find(
        (m: Model) =>
          m.slug?.current?.toLowerCase() === model.toLowerCase() ||
          slugify(m.name, { lower: true }) === model.toLowerCase(),
      ) || null;

    if (!modelData) return { notFound: true };

    const yearData =
      modelData.years?.find(
        (y: Year) =>
          (typeof y.slug === "string" &&
            y.slug.toLowerCase() === year.toLowerCase()) ||
          slugify(y.range, { lower: true }) === year.toLowerCase(),
      ) || null;

    if (!yearData) return { notFound: true };

    return { props: { brandData, modelData, yearData } };
  } catch (err) {
    console.error("Year fetch failed:", err);
    return { notFound: true };
  }
};

export default function YearPage({
  brandData,
  modelData,
  yearData,
}: YearPageProps) {
  const router = useRouter();

  if (!brandData || !modelData || !yearData) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model} / {router.query.year}
        </h1>
        <p className="text-red-500">Ingen data hittades.</p>
      </div>
    );
  }

  const brandSlug =
    brandData.slug?.current || slugify(brandData.name, { lower: true });
  const modelSlug =
    (typeof modelData.slug === "object"
      ? (modelData.slug.current as string)
      : (modelData.slug as unknown as string)) ||
    slugify(modelData.name, { lower: true });
  const yearSlug =
    (typeof yearData.slug === "string"
      ? yearData.slug
      : (yearData.slug as unknown as string)) ||
    slugify(yearData.range, { lower: true });

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 🔙 Tillbaka till Modell */}
      <div className="mb-4">
        <Link
          href={`/${brandSlug}/${modelSlug}`}
          className="text-sm text-orange-500 hover:underline"
        >
          ← Tillbaka till {brandData.name} {modelData.name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">
        {brandData.name} {modelData.name} ({yearData.range})
      </h1>

      <h2 className="text-xl font-semibold mb-3">Motorer</h2>
      <ul className="space-y-2">
        {yearData.engines?.map((engine: Engine, i: number) => {
          const engineSlug =
            engine.slug ||
            slugify(engine.label || `engine-${i}`, { lower: true });

          return (
            <li key={engine._id || i}>
              <Link
                href={`/${brandSlug}/${modelSlug}/${yearSlug}/${engineSlug}`}
                className="text-orange-500 hover:underline"
              >
                {engine.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine } from "@/types/sanity";
import slugify from "slugify";

const slugExtractor = (val: any, fallback: string): string => {
  if (!val) return slugify(fallback, { lower: true });
  if (typeof val === "string") return val.toLowerCase();
  if (typeof val === "object" && val.current) return val.current.toLowerCase();
  return slugify(fallback, { lower: true });
};

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

export const getServerSideProps: GetServerSideProps<YearPageProps> = async (
  context,
) => {
  const brand = (context.params?.brand as string)?.toLowerCase() || "";
  const model = (context.params?.model as string)?.toLowerCase() || "";
  const year = (context.params?.year as string)?.toLowerCase() || "";

  const brandData: Brand = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) => slugExtractor(m.slug, m.name) === model,
    ) || null;

  if (!modelData) return { notFound: true };

  const yearData =
    modelData.years?.find(
      (y: Year) => slugExtractor(y.slug, y.range) === year,
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
  if (!brandData || !modelData || !yearData)
    return <p>Ingen data hittades.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {brandData.name} {modelData.name} ({yearData.range})
      </h1>
      <ul className="space-y-2">
        {yearData.engines?.map((engine: Engine) => (
          <li key={engine._id || engine.label}>
            <Link
              href={`/${slugExtractor(brandData.slug, brandData.name)}/${slugExtractor(modelData.slug, modelData.name)}/${slugExtractor(yearData.slug, yearData.range)}/${slugExtractor(engine.slug, engine.label)}`}
              className="text-orange-500 hover:underline"
            >
              {engine.label}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href={`/${slugExtractor(brandData.slug, brandData.name)}/${slugExtractor(modelData.slug, modelData.name)}`}
          className="text-sm text-gray-400 hover:underline"
        >
          ← Tillbaka till {brandData.name} {modelData.name}
        </Link>
      </div>
    </div>
  );
}

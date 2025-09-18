import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year } from "@/types/sanity";
import slugify from "slugify";

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

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
        m.slug?.current === model ||
        slugify(m.name, { lower: true }) === slugify(model, { lower: true }),
    ) || null;

  if (!modelData) return { notFound: true };

  const yearData =
    modelData.years?.find(
      (y: Year) =>
        y.slug?.current === year ||
        slugify(y.range, { lower: true }) === slugify(year, { lower: true }),
    ) || null;

  if (!yearData) return { notFound: true };

  return { props: { brandData, modelData, yearData } };
};

export default function YearPage({ brandData, modelData, yearData }: YearPageProps) {
  if (!brandData || !modelData || !yearData) return <p>Ingen data hittades.</p>;

  const brandSlug = brandData.slug?.current || slugify(brandData.name, { lower: true });
  const modelSlug = modelData.slug?.current || slugify(modelData.name, { lower: true });
  const yearSlug = yearData.slug?.current || slugify(yearData.range, { lower: true });

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tillbaka-knapp */}
      <div className="mb-4">
        <Link href={`/${brandSlug}/${modelSlug}`}>
          <span className="text-sm text-orange-500 hover:underline">
            ← Tillbaka till {brandData.name} {modelData.name}
          </span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {brandData.name} {modelData.name} {yearData.range}
      </h1>
      <ul className="space-y-3">
        {yearData.engines?.map((engine) => (
          <li key={engine._id}>
            <Link
              href={`/${brandSlug}/${modelSlug}/${yearSlug}/${engine.slug?.current || slugify(engine.label, { lower: true })}`}
              className="text-blue-400 hover:underline"
            >
              {engine.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

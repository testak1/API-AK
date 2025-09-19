import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine } from "@/types/sanity";
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

  try {
    const brandData = await client.fetch(brandBySlugQuery, { brand });
    if (!brandData) return { notFound: true };

    const modelData =
      brandData.models?.find(
        (m: Model) =>
          slugify(m.name, { lower: true }) === model.toLowerCase() ||
          m.slug?.current?.toLowerCase() === model.toLowerCase() ||
          (typeof m.slug === "string" &&
            m.slug.toLowerCase() === model.toLowerCase()),
      ) || null;

    if (!modelData) return { notFound: true };

    const yearData =
      modelData.years?.find(
        (y: Year) =>
          slugify(y.range, { lower: true }) === year.toLowerCase() ||
          y.slug?.current?.toLowerCase() === year.toLowerCase() ||
          (typeof y.slug === "string" &&
            y.slug.toLowerCase() === year.toLowerCase()),
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
  if (!brandData || !modelData || !yearData) return <p>Ingen data</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <button
        onClick={() => history.back()}
        className="text-sm text-orange-500 hover:underline mb-4"
      >
        ← Tillbaka till {brandData.name} {modelData.name}
      </button>

      <h1 className="text-3xl font-bold mb-6">
        {brandData.name} {modelData.name} {yearData.range}
      </h1>
      <ul className="space-y-3">
        {yearData.engines?.map((engine, i) => {
          const engineSlug =
            (typeof engine.slug === "string" && engine.slug) ||
            (engine.slug &&
              typeof engine.slug === "object" &&
              (engine.slug.current as string)) ||
            slugify(engine.label || `engine-${i}`, { lower: true });

          return (
            <li key={engine._id || engineSlug}>
              <Link
                href={`/${brandData.slug?.current || slugify(brandData.name, {
                  lower: true,
                })}/${modelData.slug?.current || slugify(modelData.name, {
                  lower: true,
                })}/${yearData.slug?.current || slugify(yearData.range, {
                  lower: true,
                })}/${engineSlug}`}
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

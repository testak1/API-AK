import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year } from "@/types/sanity";
import slugify from "slugify";

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");

  try {
    const brandData = await client.fetch(brandBySlugQuery, { brand });
    if (!brandData) return { notFound: true };

    const modelData =
      brandData.models?.find(
        (m: Model) =>
          m.slug?.current?.toLowerCase() === model.toLowerCase() ||
          (typeof m.slug === "string" &&
            m.slug.toLowerCase() === model.toLowerCase()) ||
          slugify(m.name, { lower: true }) === model.toLowerCase(),
      ) || null;

    if (!modelData) return { notFound: true };

    return { props: { brandData, modelData } };
  } catch (err) {
    console.error("Model fetch failed:", err);
    return { notFound: true };
  }
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  if (!brandData || !modelData) return <p>Ingen data</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <button
        onClick={() => history.back()}
        className="text-sm text-orange-500 hover:underline mb-4"
      >
        ← Tillbaka till {brandData.name}
      </button>

      <h1 className="text-3xl font-bold mb-6">
        {brandData.name} {modelData.name}
      </h1>
      <ul className="space-y-3">
        {modelData.years?.map((year) => {
          const yearSlug =
            (typeof year.slug === "string" && year.slug) ||
            (year.slug &&
              typeof year.slug === "object" &&
              (year.slug.current as string)) ||
            slugify(year.range, { lower: true });

          return (
            <li key={year._id || yearSlug}>
              <Link
                href={`/${brandData.slug?.current || slugify(brandData.name, {
                  lower: true,
                })}/${modelData.slug?.current || slugify(modelData.name, {
                  lower: true,
                })}/${yearSlug}`}
                className="text-orange-500 hover:underline"
              >
                {year.range}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

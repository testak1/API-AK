// pages/[brand]/[model]/index.tsx
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model, Year } from "@/types/sanity";
import Link from "next/link";
import { useRouter } from "next/router";
import slugify from "slugify";

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async (
  context,
) => {
  const brand = context.params?.brand as string;
  const model = context.params?.model as string;

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

    return { props: { brandData, modelData } };
  } catch (err) {
    console.error("Model fetch failed:", err);
    return { notFound: true };
  }
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  const router = useRouter();

  if (!brandData || !modelData) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} / {router.query.model}
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

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* 🔙 Tillbaka till Märke */}
      <div className="mb-4">
        <Link
          href={`/${brandSlug}`}
          className="text-sm text-orange-500 hover:underline"
        >
          ← Tillbaka till {brandData.name}
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-4">
        {brandData.name} {modelData.name}
      </h1>

      <h2 className="text-xl font-semibold mb-3">Årsmodeller</h2>
      <ul className="space-y-2">
        {modelData.years?.map((year: Year, i: number) => {
          const yearSlug =
            (typeof year.slug === "string"
              ? year.slug
              : (year.slug as unknown as string)) ||
            slugify(year.range, { lower: true });

          return (
            <li key={year._id || i}>
              <Link
                href={`/${brandSlug}/${modelSlug}/${yearSlug}`}
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

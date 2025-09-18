import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model } from "@/types/sanity";
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

  const brandData = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        m.slug?.current === model ||
        slugify(m.name, { lower: true }) === slugify(model, { lower: true }),
    ) || null;

  if (!modelData) return { notFound: true };

  return { props: { brandData, modelData } };
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  if (!brandData || !modelData) return <p>Ingen data hittades.</p>;

  const brandSlug = brandData.slug?.current || slugify(brandData.name, { lower: true });
  const modelSlug = modelData.slug?.current || slugify(modelData.name, { lower: true });

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tillbaka-knapp */}
      <div className="mb-4">
        <Link href={`/${brandSlug}`}>
          <span className="text-sm text-orange-500 hover:underline">
            ← Tillbaka till {brandData.name}
          </span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">
        {brandData.name} {modelData.name}
      </h1>
      <ul className="space-y-3">
        {modelData.years?.map((year) => (
          <li key={year._id}>
            <Link
              href={`/${brandSlug}/${modelSlug}/${year.slug?.current || slugify(year.range, { lower: true })}`}
              className="text-blue-400 hover:underline"
            >
              {year.range}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

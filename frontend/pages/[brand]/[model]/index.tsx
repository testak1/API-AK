import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year } from "@/types/sanity";
import slugify from "slugify";

const slugExtractor = (val: any, fallback: string): string => {
  if (!val) return slugify(fallback, { lower: true });
  if (typeof val === "string") return val.toLowerCase();
  if (typeof val === "object" && val.current) return val.current.toLowerCase();
  return slugify(fallback, { lower: true });
};

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async (
  context,
) => {
  const brand = (context.params?.brand as string)?.toLowerCase() || "";
  const model = (context.params?.model as string)?.toLowerCase() || "";

  const brandData: Brand = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) => slugExtractor(m.slug, m.name) === model,
    ) || null;

  if (!modelData) return { notFound: true };

  return {
    props: {
      brandData,
      modelData,
    },
  };
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  if (!brandData || !modelData) return <p>Ingen data hittades.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {brandData.name} {modelData.name}
      </h1>
      <ul className="space-y-2">
        {modelData.years?.map((year: Year) => (
          <li key={year._id || year.range}>
            <Link
              href={`/${slugExtractor(brandData.slug, brandData.name)}/${slugExtractor(modelData.slug, modelData.name)}/${slugExtractor(year.slug, year.range)}`}
              className="text-orange-500 hover:underline"
            >
              {year.range}
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Link
          href={`/${slugExtractor(brandData.slug, brandData.name)}`}
          className="text-sm text-gray-400 hover:underline"
        >
          ← Tillbaka till {brandData.name}
        </Link>
      </div>
    </div>
  );
}

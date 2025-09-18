import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { yearBySlugQuery } from "@/src/lib/queries";
import { Brand, Year } from "@/types/sanity";

interface YearPageProps {
  brandName: string;
  brandSlug: string;
  modelName: string;
  modelSlug: string;
  year: Year | null;
}

export const getServerSideProps: GetServerSideProps<YearPageProps> = async ({
  params,
}) => {
  const brandSlug = params?.brand as string;
  const modelSlug = params?.model as string;
  const yearSlug = params?.year as string;

  const brandData = await client.fetch(yearBySlugQuery, { brand: brandSlug });

  if (!brandData) return { notFound: true };

  const model =
    brandData.models?.find(
      (m: any) =>
        m.slug === modelSlug ||
        m.name.toLowerCase().replace(/\s+/g, "-") === modelSlug,
    ) || null;

  if (!model) return { notFound: true };

  const year =
    model.years?.find(
      (y: any) =>
        y.slug === yearSlug ||
        y.range.toLowerCase().replace(/\s+/g, "-") === yearSlug,
    ) || null;

  if (!year) return { notFound: true };

  return {
    props: {
      brandName: brandData.name,
      brandSlug: brandData.slug,
      modelName: model.name,
      modelSlug: model.slug,
      year,
    },
  };
};

export default function YearPage({
  brandName,
  brandSlug,
  modelName,
  modelSlug,
  year,
}: YearPageProps) {
  if (!year) return <p>Year not found</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {brandName} {modelName} {year.range}
      </h1>

      <h2 className="text-xl font-semibold mb-4">Motorer</h2>
      <ul className="space-y-2">
        {year.engines?.map((engine) => (
          <li key={engine._id}>
            <Link
              href={`/${brandSlug}/${modelSlug}/${year.slug}/${engine.slug}`}
            >
              <span className="text-orange-500 hover:underline">
                {engine.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

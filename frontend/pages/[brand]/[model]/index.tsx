import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { modelBySlugQuery } from "@/src/lib/queries";
import { Brand, Model } from "@/types/sanity";

interface ModelPageProps {
  brandName: string;
  brandSlug: string;
  model: Model | null;
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async ({
  params,
}) => {
  const brandSlug = params?.brand as string;
  const modelSlug = params?.model as string;

  const brandData = await client.fetch(modelBySlugQuery, { brand: brandSlug });

  if (!brandData) return { notFound: true };

  const model =
    brandData.models?.find(
      (m: any) =>
        m.slug === modelSlug ||
        m.name.toLowerCase().replace(/\s+/g, "-") === modelSlug,
    ) || null;

  if (!model) return { notFound: true };

  return {
    props: {
      brandName: brandData.name,
      brandSlug: brandData.slug,
      model,
    },
  };
};

export default function ModelPage({
  brandName,
  brandSlug,
  model,
}: ModelPageProps) {
  if (!model) return <p>Model not found</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">
        {brandName} {model.name}
      </h1>

      <h2 className="text-xl font-semibold mb-4">Årsmodeller</h2>
      <ul className="space-y-2">
        {model.years?.map((year) => (
          <li key={year._id}>
            <Link href={`/${brandSlug}/${model.slug}/${year.slug}`}>
              <span className="text-orange-500 hover:underline">
                {year.range}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

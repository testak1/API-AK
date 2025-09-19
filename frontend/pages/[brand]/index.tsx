import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandsLightQuery } from "@/src/lib/queries";
import type { Brand } from "@/types/sanity";
import slugify from "slugify";

const slugExtractor = (val: any, fallback: string): string => {
  if (!val) return slugify(fallback, { lower: true });
  if (typeof val === "string") return val.toLowerCase();
  if (typeof val === "object" && val.current) return val.current.toLowerCase();
  return slugify(fallback, { lower: true });
};

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = (context.params?.brand as string)?.toLowerCase() || "";

  const allBrands: Brand[] = await client.fetch(brandsLightQuery);

  const brandData =
    allBrands.find((b) => slugExtractor(b.slug, b.name) === brand) || null;

  if (!brandData) return { notFound: true };

  return {
    props: {
      brandData,
    },
  };
};

export default function BrandPage({ brandData }: BrandPageProps) {
  if (!brandData) return <p>Ingen data för detta märke.</p>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">{brandData.name}</h1>
      <ul className="space-y-2">
        {brandData.models?.map((model) => (
          <li key={model._id || model.name}>
            <Link
              href={`/${slugExtractor(brandData.slug, brandData.name)}/${slugExtractor(model.slug, model.name)}`}
              className="text-orange-500 hover:underline"
            >
              {model.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

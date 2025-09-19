import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model } from "@/types/sanity";
import slugify from "slugify";

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");

  try {
    const brandData = await client.fetch(brandBySlugQuery, {
      brand: brand.toLowerCase(),
    });

    if (!brandData) return { notFound: true };

    return { props: { brandData } };
  } catch (err) {
    console.error("Brand fetch failed:", err);
    return { notFound: true };
  }
};

export default function BrandPage({ brandData }: BrandPageProps) {
  if (!brandData) return <p>Ingen data</p>;

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">{brandData.name}</h1>
      <ul className="space-y-3">
        {brandData.models?.map((model) => {
          const modelSlug =
            (typeof model.slug === "string" && model.slug) ||
            (model.slug &&
              typeof model.slug === "object" &&
              (model.slug.current as string)) ||
            slugify(model.name, { lower: true });

          return (
            <li key={model._id || modelSlug}>
              <Link
                href={`/${brandData.slug?.current || slugify(brandData.name, {
                  lower: true,
                })}/${modelSlug}`}
                className="text-orange-500 hover:underline"
              >
                {model.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

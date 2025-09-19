// pages/[brand]/index.tsx

import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand, Model } from "@/types/sanity";
import Link from "next/link";
import { useRouter } from "next/router";
import slugify from "slugify";

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = context.params?.brand as string;

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
  const router = useRouter();

  if (!brandData) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">
          {router.query.brand} – Märke saknas
        </h1>
        <p className="text-red-500">Ingen data hittades för detta bilmärke.</p>
      </div>
    );
  }

  const brandSlug =
    brandData.slug?.current || slugify(brandData.name, { lower: true });

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-4">{brandData.name}</h1>

      {brandData.logo?.asset?.url && (
        <img
          src={brandData.logo.asset.url}
          alt={brandData.logo.alt || brandData.name}
          className="h-16 mb-6"
        />
      )}

      <h2 className="text-xl font-semibold mb-3">Modeller</h2>
      <ul className="space-y-2">
        {brandData.models?.map((model: Model) => {
          // ✅ fallback till slugify om model.slug saknas
          const modelSlug =
            typeof model.slug === "object"
              ? model.slug.current
              : model.slug || slugify(model.name, { lower: true });

          return (
            <li key={model._id}>
              <Link
                href={`/${brandSlug}/${modelSlug}`}
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

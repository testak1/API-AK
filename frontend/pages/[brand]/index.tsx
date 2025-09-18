import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand } from "@/types/sanity";

interface BrandPageProps {
  brand: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async ({
  params,
}) => {
  const brandSlug = params?.brand as string;

  const brand = await client.fetch(brandBySlugQuery, { brand: brandSlug });

  if (!brand) {
    return { notFound: true };
  }

  return { props: { brand } };
};

export default function BrandPage({ brand }: BrandPageProps) {
  if (!brand) return <p>Brand not found</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{brand.name}</h1>

      {brand.logo?.asset?.url && (
        <img
          src={brand.logo.asset.url}
          alt={brand.logo.alt || brand.name}
          className="h-16 mb-6"
        />
      )}

      <h2 className="text-xl font-semibold mb-4">Modeller</h2>
      <ul className="space-y-2">
        {brand.models?.map((model) => (
          <li key={model._id}>
            <Link href={`/${brand.slug}/${model.slug}`}>
              <span className="text-orange-500 hover:underline">
                {model.name}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

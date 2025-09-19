import { GetServerSideProps } from "next";
import Link from "next/link";
import client, { urlFor } from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand } from "@/types/sanity";

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = context.params?.brand as string;
  const brandData = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) {
    return { notFound: true };
  }

  return { props: { brandData } };
};

export default function BrandPage({ brandData }: BrandPageProps) {
  if (!brandData) return <p>Ingen data</p>;

  const brandSlug = brandData.slug?.current || "";

  return (
    <div className="w-full max-w-6xl mx-auto px-2 p-4 sm:px-4">
      {/* Brand logo */}
      <div className="flex items-center justify-between mb-4">
        {brandData.logo?.asset?.url && (
          <img
            src={urlFor(brandData.logo).width(120).url()}
            alt={brandData.logo?.alt || brandData.name}
            className="h-12 w-auto object-contain"
          />
        )}
      </div>

      {/* Back button */}
      <div className="mb-6">
        <Link href="/" className="text-sm text-orange-500 hover:underline">
          ← Tillbaka till startsidan
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6 text-center">{brandData.name}</h1>

      <ul className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {brandData.models?.map((model) => (
          <li
            key={model._id}
            className="bg-gray-800 p-4 rounded-lg shadow hover:bg-gray-700"
          >
            <Link
              href={`/${brandSlug}/${model.slug?.current || ""}`}
              className="block text-center text-white font-medium"
            >
              {model.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

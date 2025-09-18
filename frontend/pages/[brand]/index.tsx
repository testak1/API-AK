import { GetServerSideProps } from "next";
import Link from "next/link";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import { Brand } from "@/types/sanity";
import slugify from "slugify";

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const brandData = await client.fetch(brandBySlugQuery, { brand });

  if (!brandData) return { notFound: true };

  return { props: { brandData } };
};

export default function BrandPage({ brandData }: BrandPageProps) {
  if (!brandData) return <p>Ingen data hittades.</p>;

  const brandSlug = brandData.slug?.current || slugify(brandData.name, { lower: true });

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Tillbaka-knapp */}
      <div className="mb-4">
        <Link href="/">
          <span className="text-sm text-orange-500 hover:underline">
            ← Tillbaka till alla märken
          </span>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-6">{brandData.name}</h1>
      <ul className="space-y-3">
        {brandData.models?.map((model) => (
          <li key={model._id}>
            <Link
              href={`/${brandSlug}/${model.slug?.current || slugify(model.name, { lower: true })}`}
              className="text-blue-400 hover:underline"
            >
              {model.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

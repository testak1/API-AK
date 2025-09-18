// pages/[brand]/index.tsx
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model } from "@/types/sanity";
import Link from "next/link";
import Head from "next/head";

interface BrandPageProps {
  brandData: Brand | null;
}

export const getServerSideProps: GetServerSideProps<BrandPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const lang =
    (typeof context.query.lang === "string" ? context.query.lang : null) ||
    "sv";

  const brandData = await client.fetch(brandBySlugQuery, { brand, lang });
  if (!brandData) return { notFound: true };

  return { props: { brandData } };
};

export default function BrandPage({ brandData }: BrandPageProps) {
  if (!brandData) return <p>Ingen data hittades.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Head>
        <title>Motoroptimering {brandData.name} – välj modell</title>
        <meta
          name="description"
          content={`Optimera din ${brandData.name}. Välj modell för att se tillgängliga motorer och steg.`}
        />
      </Head>

      <h1 className="text-3xl font-bold text-white mb-4">
        Motoroptimering {brandData.name}
      </h1>
      <p className="text-gray-400 mb-6">Välj modell:</p>

      <ul className="space-y-3">
        {brandData.models?.map((model: Model) => (
          <li key={model._id}>
            <Link
              href={`/${brandData.slug?.current || brandData.name.toLowerCase()}/${model.slug?.current || model.name.toLowerCase()}`}
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

// pages/[brand]/[model]/index.tsx
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year } from "@/types/sanity";
import Link from "next/link";
import Head from "next/head";

interface ModelPageProps {
  brandData: Brand | null;
  modelData: Model | null;
}

export const getServerSideProps: GetServerSideProps<ModelPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const lang =
    (typeof context.query.lang === "string" ? context.query.lang : null) ||
    "sv";

  const brandData = await client.fetch(brandBySlugQuery, { brand, lang });
  if (!brandData) return { notFound: true };

  const modelData =
    brandData.models?.find(
      (m: Model) =>
        m.slug?.current?.toLowerCase() === model.toLowerCase() ||
        m.name.toLowerCase() === model.toLowerCase(),
    ) || null;

  if (!modelData) return { notFound: true };

  return { props: { brandData, modelData } };
};

export default function ModelPage({ brandData, modelData }: ModelPageProps) {
  if (!brandData || !modelData) return <p>Ingen data hittades.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Head>
        <title>
          Motoroptimering {brandData.name} {modelData.name} – välj årsmodell
        </title>
        <meta
          name="description"
          content={`Optimera din ${brandData.name} ${modelData.name}. Välj årsmodell för att se motorer och steg.`}
        />
      </Head>

      <h1 className="text-3xl font-bold text-white mb-4">
        Motoroptimering {brandData.name} {modelData.name}
      </h1>
      <p className="text-gray-400 mb-6">Välj årsmodell:</p>

      <ul className="space-y-3">
        {modelData.years?.map((year: Year) => (
          <li key={year._id}>
            <Link
              href={`/${brandData.slug?.current || brandData.name.toLowerCase()}/${modelData.slug?.current || modelData.name.toLowerCase()}/${year.slug || year.range}`}
              className="text-orange-500 hover:underline"
            >
              {year.range}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

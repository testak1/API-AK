// pages/[brand]/[model]/[year]/index.tsx
import { GetServerSideProps } from "next";
import client from "@/lib/sanity";
import { brandBySlugQuery } from "@/src/lib/queries";
import type { Brand, Model, Year, Engine } from "@/types/sanity";
import Link from "next/link";
import Head from "next/head";

interface YearPageProps {
  brandData: Brand | null;
  modelData: Model | null;
  yearData: Year | null;
}

export const getServerSideProps: GetServerSideProps<YearPageProps> = async (
  context,
) => {
  const brand = decodeURIComponent((context.params?.brand as string) || "");
  const model = decodeURIComponent((context.params?.model as string) || "");
  const year = decodeURIComponent((context.params?.year as string) || "");
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

  const yearData =
    modelData.years?.find(
      (y: Year) =>
        y.slug?.toLowerCase() === year.toLowerCase() ||
        y.range.toLowerCase() === year.toLowerCase(),
    ) || null;

  if (!yearData) return { notFound: true };

  return { props: { brandData, modelData, yearData } };
};

export default function YearPage({
  brandData,
  modelData,
  yearData,
}: YearPageProps) {
  if (!brandData || !modelData || !yearData) return <p>Ingen data hittades.</p>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <Head>
        <title>
          Motoroptimering {brandData.name} {modelData.name} {yearData.range} –
          välj motor
        </title>
        <meta
          name="description"
          content={`Optimera din ${brandData.name} ${modelData.name} ${yearData.range}. Välj motor för att se tillgängliga steg.`}
        />
      </Head>

      <h1 className="text-3xl font-bold text-white mb-4">
        Motoroptimering {brandData.name} {modelData.name} {yearData.range}
      </h1>
      <p className="text-gray-400 mb-6">Välj motor:</p>

      <ul className="space-y-3">
        {yearData.engines?.map((engine: Engine) => (
          <li key={engine._id}>
            <Link
              href={`/${brandData.slug?.current || brandData.name.toLowerCase()}/${modelData.slug?.current || modelData.name.toLowerCase()}/${yearData.slug || yearData.range}/${engine.slug || engine.label}`}
              className="text-orange-500 hover:underline"
            >
              {engine.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

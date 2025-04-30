// app/[brand]/[model]/[year]/[engine]/page.tsx

import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { allBrandsQuery } from "@/src/lib/queries";

function slugifySafe(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s\/]+/g, "-") // replace spaces and slashes with dash
    .replace(/[^\w-]+/g, "") // remove everything except words and dash
    .replace(/-{2,}/g, "-") // collapse multiple dashes
    .replace(/^-+|-+$/g, ""); // remove starting or ending dash
}

interface Props {
  params: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
}

export const dynamicParams = false;
export default async function EnginePage({ params }: Props) {
  const { brand, model, year, engine } = params;

  const brandsData = await client.fetch(allBrandsQuery);
  if (!brandsData) notFound();

  const brandData = brandsData.find((b: any) => slugifySafe(b.slug) === brand);
  if (!brandData) notFound();

  const modelData = brandData.models.find(
    (m: any) => slugifySafe(m.name) === model
  );
  if (!modelData) notFound();

  const yearData = modelData.years.find(
    (y: any) => slugifySafe(y.range) === year
  );
  if (!yearData) notFound();

  const engineData = yearData.engines.find(
    (e: any) => slugifySafe(e.label) === engine
  );
  if (!engineData) notFound();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-center mb-6">
        {brandData.name} {modelData.name} {yearData.range} – {engineData.label}
      </h1>

      {/* Show tuning stages */}
      <div className="space-y-8">
        {engineData.stages?.length > 0 ? (
          engineData.stages.map((stage: any) => (
            <div
              key={stage.name}
              className="bg-gray-800 p-6 rounded-lg shadow-md"
            >
              <h2 className="text-xl font-bold text-indigo-400 mb-2">
                {stage.name}
              </h2>
              <p className="text-white mb-2">
                Original: {stage.origHk} HK / {stage.origNm} NM
              </p>
              <p className="text-green-400 mb-2">
                Tuned: {stage.tunedHk} HK / {stage.tunedNm} NM
              </p>
              {stage.descriptionRef?.description ? (
                <div className="prose prose-invert text-white mt-4">
                  <PortableText value={stage.descriptionRef.description} />
                </div>
              ) : stage.description ? (
                <div className="prose prose-invert text-white mt-4">
                  <PortableText value={stage.description} />
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-center text-white">
            Inga steg hittades för denna motor.
          </p>
        )}
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const brandsData = await client.fetch(allBrandsQuery);
  if (!brandsData) return [];

  const paths = [];

  for (const b of brandsData) {
    const brandSlug = slugifySafe(b.slug);
    for (const m of b.models || []) {
      const modelSlug = slugifySafe(m.name);
      for (const y of m.years || []) {
        const yearSlug = slugifySafe(y.range);
        for (const e of y.engines || []) {
          const engineSlug = slugifySafe(e.label);
          paths.push({
            brand: brandSlug,
            model: modelSlug,
            year: yearSlug,
            engine: engineSlug,
          });
        }
      }
    }
  }

  return paths;
}

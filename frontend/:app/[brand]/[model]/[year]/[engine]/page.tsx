// app/[brand]/[model]/[year]/[engine]/page.tsx

import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { allBrandsQuery } from "@/src/lib/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
}

// Helper to normalize slugs
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove weird characters
    .replace(/\s+/g, "-")     // Replace spaces with hyphens
    .replace(/-+/g, "-")      // Collapse hyphens
    .replace(/→/g, "-")       // Special fix for arrows
    .replace(/–/g, "-");      // Special fix for en-dash
}

export default async function EnginePage({ params }: Props) {
  const { brand, model, year, engine } = params;

  const brandsData = await client.fetch(allBrandsQuery);
  if (!brandsData) notFound();

  const brandData = brandsData.find(
    (b: any) => normalize(b.slug) === normalize(brand)
  );
  if (!brandData) notFound();

  const modelData = brandData.models.find(
    (m: any) => normalize(m.name) === normalize(model)
  );
  if (!modelData) notFound();

  const yearData = modelData.years.find((y: any) => {
    const yNorm = normalize(y.range);
    const paramNorm = normalize(year);
    return yNorm === paramNorm;
  });
  if (!yearData) notFound();

  const engineData = yearData.engines.find(
    (e: any) => normalize(e.label) === normalize(engine)
  );
  if (!engineData) notFound();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-center mb-6">
        {brandData.name} {modelData.name} {yearData.range} – {engineData.label}
      </h1>

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
          <p className="text-center text-white">Inga steg hittades för denna motor.</p>
        )}
      </div>
    </div>
  );
}

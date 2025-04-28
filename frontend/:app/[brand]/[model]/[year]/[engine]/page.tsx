// /app/[brand]/[model]/[year]/[engine]/page.tsx
import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity"; // your existing sanity.ts
import { allBrandsQuery } from "@/src/lib/queries";

interface Props {
  params: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
}

export const dynamic = "force-dynamic"; // 🛡️ ensures it runs dynamically even in production

export default async function EnginePage({ params }: Props) {
  const { brand, model, year, engine } = params;

  // Fetch from Sanity
  const brandsData = await client.fetch(allBrandsQuery);

  if (!brandsData) {
    notFound();
  }

  // Find the brand
  const brandData = brandsData.find(
    (b: any) => b.slug?.toLowerCase() === brand.toLowerCase()
  );
  if (!brandData) notFound();

  // Find the model
  const modelData = brandData.models.find(
    (m: any) =>
      m.name?.toLowerCase().replace(/\s+/g, "-") === model.toLowerCase()
  );
  if (!modelData) notFound();

  // Find the year
  const yearData = modelData.years.find(
    (y: any) =>
      y.range?.toLowerCase().replace(/\s+/g, "-") === year.toLowerCase()
  );
  if (!yearData) notFound();

  // Find the engine
  const engineData = yearData.engines.find(
    (e: any) =>
      e.label?.toLowerCase().replace(/\s+/g, "-") === engine.toLowerCase()
  );
  if (!engineData) notFound();

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl font-bold text-center mb-6">
        {brandData.name} {modelData.name} {yearData.range} – {engineData.label}
      </h1>

      {/* Tuning Stages */}
      <div className="space-y-8">
        {engineData.stages?.length > 0 ? (
          engineData.stages.map((stage: any) => (
            <div key={stage.name} className="bg-gray-800 p-6 rounded-lg shadow-md">
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

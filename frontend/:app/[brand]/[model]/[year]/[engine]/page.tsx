// app/[brand]/[model]/[year]/[engine]/page.tsx

import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity";
import { engineByParamsQuery } from "@/src/lib/queries";
import { useEffect } from "react";

// Match exactly what's in your index.tsx
function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "") // Remove special chars except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Collapse multiple hyphens
}

// Match exactly what's in your index.tsx
function slugifyStage(stage: string) {
  return stage.toLowerCase().replace(/\s+/g, "-");
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

  // Handle anchor scrolling on client-side
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const element = document.getElementById(
        window.location.hash.substring(1)
      );
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
          // Add temporary highlight
          element.classList.add("ring-2", "ring-indigo-500");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-indigo-500");
          }, 2000);
        }, 300);
      }
    }
  }, []);

  const brandsData = await client.fetch(allBrandsQuery);
  if (!brandsData) notFound();

  const brandData = brandsData.find((b: any) => slugify(b.slug) === brand);
  if (!brandData) notFound();

  const modelData = brandData.models.find(
    (m: any) => slugify(m.name) === model
  );
  if (!modelData) notFound();

  const yearData = modelData.years.find((y: any) => slugify(y.range) === year);
  if (!yearData) notFound();

  const engineData = yearData.engines.find(
    (e: any) => slugify(e.label) === engine
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
          engineData.stages.map((stage: any) => {
            const stageSlug = slugifyStage(stage.name);
            return (
              <div
                key={stage.name}
                id={stageSlug}
                className="bg-gray-800 p-6 rounded-lg shadow-md transition-all duration-300"
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
            );
          })
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
    const brandSlug = slugify(b.slug);
    for (const m of b.models || []) {
      const modelSlug = slugify(m.name);
      for (const y of m.years || []) {
        const yearSlug = slugify(y.range);
        for (const e of y.engines || []) {
          const engineSlug = slugify(e.label);
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

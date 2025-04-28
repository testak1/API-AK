// app/[brand]/[model]/[year]/[engine]/page.tsx

import { notFound } from "next/navigation";
import { PortableText } from "@portabletext/react";
import client from "@/lib/sanity"; // Correct import!
import { allBrandsQuery } from "@/lib/queries"; // Correct import!

export const dynamic = "force-dynamic"; // Important to make it dynamic loading!

interface Props {
  params: {
    brand: string;
    model: string;
    year: string;
    engine: string;
  };
}

// Normalizes strings for matching (lowercase, no spaces, no special chars)
function normalize(str: string) {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")  // remove everything except words, spaces, hyphens
    .replace(/\s+/g, "-")       // spaces to hyphens
    .replace(/-+/g, "-")        // multiple hyphens collapsed
    .replace(/→/g, "-")         // arrow to hyphen
    .replace(/–/g, "-")         // en-dash to hyphen
    .replace(/\//g, "-")        // slashes to hyphen
    .replace(/\./g, "");        // remove dots
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
    const normalizedRange = normalize(y.range);
    const normalizedParam = normalize(year);
    return normalizedRange === normalizedParam;
  });
  if (!yearData) notFound();

  const engineData = yearData.engines.find((e: any) => {
    const normalizedLabel = normalize(e.label);
    const normalizedParam = normalize(engine);
    return normalizedLabel === normalizedParam;
  });
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

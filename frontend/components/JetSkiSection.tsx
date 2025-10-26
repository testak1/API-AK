"use client";

import {useState, useEffect} from "react";
// Du måste importera din urlFor-funktion.
// Den finns i index.tsx, så den ligger nog i /lib/sanity.ts
import {urlFor} from "@/lib/sanity";

// --- UPPDATERADE TYPDEFINITIONER ---
interface JetSkiModel {
  _id: string;
  model: string;
  year: string;
  engine: string;
  origHk?: number;
  tunedHk?: number;
  // NYA FÄLT TILLAGDA HÄR:
  origNm?: number;
  tunedNm?: number;
  // Slut på nya fält
  price?: number;
}

interface JetSkiBrand {
  _id: string;
  name: string;
  logo: any;
  models: JetSkiModel[];
}
// ------------------------------------

export function JetSkiSection() {
  const [brands, setBrands] = useState<JetSkiBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- DATALADDNING (oförändrad) ---
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/jetski-brands");
        if (!res.ok) {
          throw new Error("Nätverkssvar var inte ok");
        }
        const data = await res.json();
        setBrands(data.brands || []);
      } catch (err: any) {
        console.error("Kunde inte hämta vattenskoterdata", err);
        setError("Kunde inte ladda vattenskotrar.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);
  // ------------------------------------

  if (isLoading) {
    return (
      <section className="vehicle-section mb-6">
        <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
          Vattenskotrar
        </h3>
        <p className="text-gray-500">Laddar vattenskotrar...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="vehicle-section mb-6">
        <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
          Vattenskotrar
        </h3>
        <p className="text-red-500">{error}</p>
      </section>
    );
  }

  if (brands.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
        Vattenskotrar
      </h3>

      {brands.map(brand => (
        <details
          key={brand._id}
          open={false}
          className="mb-4 bg-white border border-gray-200 rounded-xl shadow-md transition duration-300 hover:shadow-lg"
        >
          <summary
            className="brand-summary cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
            style={{listStyle: "none"}}
          >
            {/* Vänster sida: Logotyp och Namn */}
            <div className="flex items-center gap-4">
              {brand.logo?.asset && (
                <img
                  src={urlFor(brand.logo).width(60).url()}
                  alt={`${brand.name} logo`}
                  className="w-12 h-12 object-contain"
                />
              )}
              <span className="text-lg font-bold text-gray-800">
                {brand.name}
              </span>
            </div>

            {/* Höger sida: Antal modeller och Expand-ikon */}
            <div className="flex items-center gap-4 text-gray-500">
              <span className="text-sm font-medium">
                {brand.models?.length || 0} modeller
              </span>
              {/* Enkel roterande pil (fungerar automatiskt med details/summary) */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 transform transition-transform details-arrow"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10l-3.293-3.293a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </summary>

          {/* Stilar för att rotera pilen när details är öppen */}
          <style jsx global>{`
            details[open] > summary .details-arrow {
              transform: rotate(90deg);
            }
          `}</style>

          <div className="model-list p-4 border-t border-gray-200">
            {(brand.models?.length || 0) > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {brand.models?.map(model => (
                  <div
                    key={model._id}
                    className="model-item bg-white p-4 rounded-lg border border-gray-200 shadow-sm transition hover:border-orange-400"
                  >
                    <strong className="text-lg font-semibold text-gray-900 block">
                      {model.model} ({model.year})
                    </strong>

                    <div className="mt-2 text-sm space-y-1">
                      <p className="text-gray-700">
                        <span className="font-medium text-gray-600">
                          Motor:
                        </span>{" "}
                        {model.engine}
                      </p>

                      {/* Prestandatabell/rad - OFÖRÄNDRAD LOGIK */}
                      {(model.origHk && model.tunedHk) ||
                      (model.origNm && model.tunedNm) ? (
                        <div className="flex justify-between items-center py-1 border-t border-dashed mt-2">
                          {model.origHk && model.tunedHk && (
                            <p className="text-xs font-medium">
                              HK: {model.origHk} →{" "}
                              <span className="font-bold text-green-600">
                                {model.tunedHk}
                              </span>
                            </p>
                          )}
                          {model.origNm && model.tunedNm && (
                            <p className="text-xs font-medium ml-4">
                              NM: {model.origNm} →{" "}
                              <span className="font-bold text-green-600">
                                {model.tunedNm}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Pris - Sätts i fokus */}
                    {model.price && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xl font-extrabold text-orange-500">
                          {model.price.toLocaleString("sv-SE", {
                            style: "currency",
                            currency: "SEK",
                            minimumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 p-2">
                Inga modeller hittades för detta märke.
              </p>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}

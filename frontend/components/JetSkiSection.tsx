"use client";

import {useState, useEffect} from "react";
// Du måste importera din urlFor-funktion.
// Den finns i index.tsx, så den ligger nog i /lib/sanity.ts
import {urlFor} from "@/lib/sanity";

interface JetSkiModel {
  _id: string;
  model: string;
  year: string;
  engine: string;
  origHk?: number;
  tunedHk?: number;
  price?: number;
}

interface JetSkiBrand {
  _id: string;
  name: string;
  logo: any;
  models: JetSkiModel[]; // Vi vet att detta nu är en array tack vare API-fixen
}

export function JetSkiSection() {
  const [brands, setBrands] = useState<JetSkiBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    // UPPDATERAD SEKTIONSTITEL FÖR ATT MATCHA PERSONBILAR/LASTBILAR
    <div className="mb-6">
      <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
        Vattenskotrar
      </h3>

      {brands.map(brand => (
        <details
          key={brand._id}
          open={false}
          className="mb-4 bg-white border border-gray-200 rounded-xl shadow-sm"
        >
          <summary className="brand-summary cursor-pointer p-4 flex items-center gap-4 hover:bg-gray-50">
            {brand.logo?.asset && (
              <img
                src={urlFor(brand.logo).width(100).url()}
                alt={`${brand.name} logo`}
                className="w-16 h-16 object-contain"
              />
            )}
            <span className="text-lg font-medium text-gray-800">
              {/*
                HÄR LÄGGER VI TILL SÄKERHETSKOLLARNA:
                1. brand.models?.length (optional chaining)
                2. || 0 (om längden är undefined, visa 0)
              */}
              {brand.name} ({brand.models?.length || 0} modeller)
            </span>
          </summary>

          <div className="model-list p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* HÄR LÄGGER VI TILL EN SÄKERHETSKOLL (?.length) */}
            {(brand.models?.length || 0) > 0 ? (
              // OCH HÄR (?.map)
              brand.models?.map(model => (
                <div
                  key={model._id}
                  className="model-item bg-gray-50 p-3 rounded-lg border border-gray-200"
                >
                  <strong className="text-gray-900">
                    {model.model} ({model.year})
                  </strong>
                  <p className="text-sm text-gray-700">Motor: {model.engine}</p>
                  {model.origHk && model.tunedHk && (
                    <p className="text-sm text-gray-700">
                      Effekt: {model.origHk} hk →{" "}
                      <span className="font-bold text-green-600">
                        {model.tunedHk} hk
                      </span>
                    </p>
                  )}
                  {model.price && (
                    <p className="text-sm font-bold text-gray-800 mt-2">
                      Pris: {model.price.toLocaleString()} SEK
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500">
                Inga modeller hittades för detta märke.
              </p>
            )}
          </div>
        </details>
      ))}
    </div> // Avsluta med </div> istället för <section>
  );
}

"use client"; // Bra vana, indikerar att detta är en klientkomponent

import {useState, useEffect} from "react";
import {urlFor} from "@/lib/sanity"; // Återanvänd din urlFor-funktion

// 1. Definiera Typer (samma som tidigare)
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
  logo: any; // Sanity image type
  models: JetSkiModel[];
}

export function JetSkiSection() {
  // 2. State för att hålla data och laddningsstatus
  const [brands, setBrands] = useState<JetSkiBrand[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 3. Hämta data när komponenten laddas
  useEffect(() => {
    async function fetchData() {
      try {
        // Anropa din nya API-rutt
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
  }, []); // Körs en gång när komponenten monteras

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
    return null; // Rendera ingenting om det inte finns några vattenskotrar
  }

  // 4. Rendera sektionen (samma JSX som tidigare)
  return (
    <section className="vehicle-section mb-6">
      <h3 className="uppercase tracking-wide text-gray-600 text-sm font-semibold mb-3 border-b border-gray-200 pb-1">
        Vattenskotrar
      </h3>

      {/* Använd <details> för att matcha din önskan om "inte expanderat".
        Denna UI är SEPARAT från din vanliga val-logik (brand/model/year/engine)
        eftersom datastrukturen är annorlunda.
      */}
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
              {brand.name} ({brand.models.length} modeller)
            </span>
          </summary>

          {/* Här listas alla modeller för märket */}
          <div className="model-list p-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            {brand.models.length > 0 ? (
              brand.models.map(model => (
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
                  {/* Du kan lägga till en "Kontakta oss"-knapp här om du vill */}
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
    </section>
  );
}

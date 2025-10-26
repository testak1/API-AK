"use client";

import {useState} from "react"; // Tog bort useEffect
// Du måste importera din urlFor-funktion.
import {urlFor} from "@/lib/sanity";

// --- TYPDEFINITIONER (oförändrade) ---
interface ContactModalData {
  isOpen: boolean;
  stageOrOption: string;
  link: string;
  scrollPosition?: number;
}
type SetContactModalData = (data: ContactModalData) => void;

interface JetSkiModel {
  _id: string;
  model: string;
  year: string;
  engine: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface JetSkiBrand {
  _id: string;
  name: string;
  logo: any;
  models: JetSkiModel[];
}

interface JetSkiSectionProps {
  setContactModalData: SetContactModalData;
  currentLanguage: string;
  translate: (lang: string, key: string) => string;
}
// ------------------------------------

export function JetSkiSection({
  setContactModalData,
  currentLanguage,
  translate,
}: JetSkiSectionProps) {
  const [brands, setBrands] = useState<JetSkiBrand[]>([]);
  // ÄNDRING: false initialt, eftersom vi inte laddar direkt
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NY STATE: Håller koll på om data har laddats en gång
  const [hasLoaded, setHasLoaded] = useState(false);
  // NY STATE: Speglar om details-elementet är öppet
  const [isExpanded, setIsExpanded] = useState(false);

  // NY FUNKTION: Logiken för att hämta data
  const fetchData = async () => {
    // Förhindra dubbelladdning
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/jetski-brands");
      if (!res.ok) {
        throw new Error("Nätverkssvar var inte ok");
      }
      const data = await res.json();
      setBrands(data.brands || []);
      setHasLoaded(true); // Markera som laddad
    } catch (err: any) {
      console.error("Kunde inte hämta vattenskoterdata", err);
      setError("Kunde inte ladda vattenskotrar.");
    } finally {
      setIsLoading(false);
    }
  };

  // NY EVENT HANDLER: Trigger datahämtning och uppdatera state
  const handleToggle = (e: React.MouseEvent<HTMLElement>) => {
    // Om vi klickar och sektionen är stängd OCH datan inte laddats, ladda datan
    if (!isExpanded && !hasLoaded) {
      fetchData();
    }
    // Uppdatera expanded state FÖRE React's native details-hantering
    setIsExpanded(!isExpanded);
  };

  // Vi renderar alltid komponenten för att ge användaren något att klicka på
  // om det finns data.
  if (brands.length === 0 && hasLoaded && !isLoading) {
    return null; // Returnera null om vi har försökt ladda men listan är tom.
  }

  return (
    // mt-8 för utrymme ovanför
    <div className="mt-8 mb-6">
      <details
        // open={false} är standard
        className="bg-white border border-gray-300 rounded-xl shadow-lg"
        // Använd onClick på summary för att hantera expandering och laddning
        onClick={e => {
          // Kontrollera att klicket kommer från summary-elementet
          if ((e.target as HTMLElement).closest("summary")) {
            handleToggle(e as React.MouseEvent<HTMLElement>);
          }
        }}
      >
        <summary
          className="cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
          style={{listStyle: "none"}}
        >
          {/* Rubrik för den expanderbara sektionen */}
          <h3 className="uppercase tracking-wide text-gray-800 text-lg font-bold">
            Vattenskotrar (Jet Skis)
          </h3>

          {/* Status och Expand-ikon */}
          <div className="flex items-center gap-4 text-gray-500">
            {isLoading ? (
              <span className="text-sm">Laddar...</span>
            ) : error ? (
              <span className="text-sm text-red-500">Fel!</span>
            ) : hasLoaded ? (
              <span className="text-sm font-medium">
                {brands.length} Märken
              </span>
            ) : (
              // NY TEXT: Vägleder användaren att klicka innan laddning
              <span className="text-sm font-medium">
                Klicka för att se modeller
              </span>
            )}

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

        {/* CSS för att rotera pilen */}
        <style jsx global>{`
          details[open] > summary .details-arrow {
            transform: rotate(90deg);
          }
        `}</style>

        {/* INNEHÅLL */}
        <div className="p-4 border-t border-gray-200">
          {(isLoading || error) && (
            <p className={`p-2 ${error ? "text-red-500" : "text-gray-500"}`}>
              {error || "Laddar data..."}
            </p>
          )}

          {/* Lista med vattenskotermärken - Renderas bara om hasLoaded är true */}
          {hasLoaded &&
            !error &&
            brands.map(brand => (
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

                <div className="model-list p-4 border-t border-gray-200">
                  {(brand.models?.length || 0) > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {brand.models?.map(model => (
                        <div
                          key={model._id}
                          className="model-item bg-white p-4 rounded-lg border border-gray-200 shadow-sm transition hover:border-orange-400"
                        >
                          {/* Modell och År */}
                          <strong className="text-lg font-semibold text-gray-900 block">
                            {model.model} [{model.year}] - {model.engine}
                          </strong>

                          {/* HK VISNING */}
                          {model.origHk && model.tunedHk ? (
                            <div className="flex items-baseline mt-1 mb-2">
                              <span className="text-sm text-gray-500 mr-2">
                                ORG HK:
                              </span>
                              <span className="text-base font-medium text-orange-500">
                                {model.origHk}
                              </span>
                              <span className="text-sm text-gray-500 mr-2">
                                OPTIMERAD HK:
                              </span>
                              <span className="text-xl font-extrabold text-green-600">
                                {model.tunedHk}
                              </span>
                            </div>
                          ) : null}

                          {/* NM-visning */}
                          <div className="mt-2 text-sm space-y-1">
                            {model.origNm && model.tunedNm ? (
                              <p className="text-xs font-medium text-gray-500">
                                NM: {model.origNm} →{" "}
                                <span className="font-bold">
                                  {model.tunedNm}
                                </span>
                              </p>
                            ) : null}
                          </div>

                          {/* Pris och Kontaktknapp */}
                          {model.price && (
                            <div className="mt-3 pt-3 border-t flex justify-between items-center">
                              <p className="text-xl font-extrabold text-orange-500">
                                {model.price.toLocaleString("sv-SE", {
                                  style: "currency",
                                  currency: "SEK",
                                  minimumFractionDigits: 0,
                                })}
                              </p>

                              <button
                                onClick={() => {
                                  // Skapar titel baserat på modellen, året och motorn
                                  const modalTitle = `${brand.name} ${model.model} [${model.year}] - ${model.engine}`;

                                  setContactModalData({
                                    isOpen: true,
                                    stageOrOption: modalTitle,
                                    link: window.location.href,
                                    scrollPosition: 0,
                                  });
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                📩 {translate(currentLanguage, "contactvalue")}
                              </button>
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
      </details>
    </div>
  );
}

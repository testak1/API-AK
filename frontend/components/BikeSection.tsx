"use client";

import {useState, useCallback, useMemo} from "react";
import {urlFor} from "@/lib/sanity";
// Använder lucide-react för snyggare ikoner
import {ChevronDown, Loader2} from "lucide-react";

// --- TYPDEFINITIONER (oförändrade) ---
interface ContactModalData {
  isOpen: boolean;
  stageOrOption: string;
  link: string;
  scrollPosition?: number;
}
type SetContactModalData = (data: ContactModalData) => void;

interface BikeModel {
  _id: string;
  model: string;
  year: string;
  engine: string;
  vehicleType?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface BikeBrand {
  _id: string;
  name: string;
  logo: any;
  models: BikeModel[];
}

interface BikeSectionProps {
  setContactModalData: SetContactModalData;
  currentLanguage: string;
  translate: (lang: string, key: string) => string;
}
// ------------------------------------

export function BikeSection({
  setContactModalData,
  currentLanguage,
  translate,
}: BikeSectionProps) {
  // Globalt tillstånd för datahämtning
  const [brands, setBrands] = useState<BikeBrand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Tillstånd för att hantera den yttre sektionens expansion
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);

  // Håller ID för det märke som är expanderat. Null = inget är öppet.
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);

  // Använder useCallback för att förhindra onödig omrendering av fetchData-funktionen
  const fetchData = useCallback(async () => {
    // Stoppar om data redan har laddats eller laddas just nu
    if (hasLoaded || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      // HÄMTNINGEN SKER HÄR
      const res = await fetch("/api/bike-brands-with-models");
      if (!res.ok) {
        throw new Error("Nätverkssvar var inte ok");
      }
      const data = await res.json();
      setBrands(data.brands || data.result || []);
      setHasLoaded(true);
    } catch (err: any) {
      console.error("Kunde inte hämta bike/quad data", err);
      setError("Kunde inte ladda bikes/quads.");
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading]); // Lägger till beroenden

  // Hantera expansion av den yttre sektionen (Hämtar data vid första expansion)
  const handleSectionToggle = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault(); // Förhindra standarddetails-beteende
    const newState = !isSectionExpanded;
    setIsSectionExpanded(newState);

    // LAZY LOADING: Laddar data endast vid expansion OCH om det inte redan är laddat
    if (newState && !hasLoaded) {
      fetchData();
    }

    // Stänger eventuellt öppet märke när huvudsektionen stängs
    if (!newState) {
      setExpandedBrandId(null);
    }
  };

  // Hantera expansion av enskilt märke (endast ett får vara öppet)
  const handleBrandToggle = (brandId: string) => {
    setExpandedBrandId(prevId => (prevId === brandId ? null : brandId));
  };

  // Undvik rendering om inga märken finns efter laddning OCH sektionen är stängd
  if (brands.length === 0 && hasLoaded && !isLoading && !isSectionExpanded) {
    return null;
  }

  // Använder useMemo för att memoizera BrandItem och optimera renderingar
  const BrandItem = useMemo(
    () =>
      ({brand}: {brand: BikeBrand}) => {
        const isThisBrandExpanded = expandedBrandId === brand._id;

        return (
          <div
            // Kontrollerar expansion via state, inte details-tagg
            className={`mb-4 bg-white border rounded-xl shadow-md transition duration-300 ${
              isThisBrandExpanded
                ? "border-red-600 shadow-xl"
                : "border-gray-200 hover:shadow-lg"
            }`}
          >
            <div
              className="brand-summary cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
              onClick={() => handleBrandToggle(brand._id)} // Styr expansionen här
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

              {/* Höger sida: Expand-ikon */}
              <ChevronDown
                className={`h-5 w-5 transform transition-transform text-gray-500 ${isThisBrandExpanded ? "rotate-180 text-red-600" : "rotate-0"}`}
              />
            </div>

            {/* Modeller visas ENDAST om detta märke är expanderat */}
            {isThisBrandExpanded && (
              <div className="model-list p-4 border-t border-gray-200">
                {(brand.models?.length || 0) > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {brand.models?.map(model => (
                      <div
                        key={model._id}
                        className="model-item bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm transition hover:border-green-600"
                      >
                        {/* Modell och År */}
                        <strong className="text-lg font-semibold text-gray-900 block">
                          {model.model} [{model.year}] - {model.engine}
                          {model.vehicleType}
                        </strong>

                        {/* --- HK & NM VISNING --- */}
                        {(model.origHk ||
                          model.tunedHk ||
                          model.origNm ||
                          model.tunedNm) && (
                          <div className="mt-2 mb-3 border-b border-gray-100 pb-2">
                            {/* HK VISNING */}
                            {(model.origHk || model.tunedHk) && (
                              <>
                                {model.origHk && (
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span className="font-semibold uppercase tracking-wider">
                                      {translate(
                                        currentLanguage,
                                        "originalHp"
                                      ) || "Original HK"}
                                      :
                                    </span>
                                    <span className="font-bold text-orange-500">
                                      {model.origHk} HK
                                    </span>
                                  </div>
                                )}

                                {model.tunedHk && (
                                  <div className="flex justify-between items-baseline mt-1">
                                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                                      {translate(
                                        currentLanguage,
                                        "OPPTIMERADHK"
                                      ) || "Optimerad HK"}
                                      :
                                    </span>
                                    <span className="text-xl font-extrabold text-green-600">
                                      {model.tunedHk} HK
                                    </span>
                                  </div>
                                )}
                                {/* Separator om både HK och NM finns */}
                                {(model.origNm || model.tunedNm) && (
                                  <div className="h-2"></div>
                                )}
                              </>
                            )}

                            {/* NM VISNING (Nu fixad med samma stil) */}
                            {(model.origNm || model.tunedNm) && (
                              <>
                                {model.origNm && (
                                  <div className="flex justify-between text-sm text-gray-600">
                                    <span className="font-semibold uppercase tracking-wider">
                                      {translate(
                                        currentLanguage,
                                        "originalNm"
                                      ) || "Original NM"}
                                      :
                                    </span>
                                    <span className="font-bold text-orange-500">
                                      {model.origNm} NM
                                    </span>
                                  </div>
                                )}
                                {model.tunedNm && (
                                  <div className="flex justify-between items-baseline mt-1">
                                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                                      {translate(
                                        currentLanguage,
                                        "OPPTIMERADNM"
                                      ) || "Optimerad NM"}
                                      :
                                    </span>
                                    <span className="text-xl font-extrabold text-green-600">
                                      {model.tunedNm} NM
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                        {/* --- SLUT PÅ HK & NM VISNING --- */}

                        {/* Pris och Kontaktknapp */}
                        <div className="mt-3 pt-3 border-t flex justify-between items-center">
                          {model.price ? (
                            <p className="text-xl font-extrabold text-orange-500">
                              {model.price.toLocaleString("sv-SE", {
                                style: "currency",
                                currency: "SEK",
                                minimumFractionDigits: 0,
                              })}
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">Pris saknas</p>
                          )}

                          <button
                            onClick={() => {
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
                            📩{" "}
                            {translate(currentLanguage, "contactvalue") ||
                              "Kontakta oss"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 p-2">
                    Inga modeller hittades för detta märke.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      },
    [expandedBrandId, setContactModalData, currentLanguage, translate]
  );

  return (
    <div className="mt-8 mb-6">
      <details
        className="bg-white border border-gray-300 rounded-xl shadow-lg"
        open={isSectionExpanded}
      >
        <summary
          className="cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
          style={{listStyle: "none"}}
          onClick={handleSectionToggle}
        >
          {/* Rubrik för den expanderbara sektionen */}
          <h3 className="uppercase tracking-wide text-gray-800 text-lg font-bold">
            {translate(currentLanguage, "BIKES_QUADS") || "Bikes & Quads"}
          </h3>

          {/* Status och Expand-ikon */}
          <div className="flex items-center gap-4 text-gray-500">
            {isLoading ? (
              <span className="text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Laddar...
              </span>
            ) : error ? (
              <span className="text-sm text-red-500">Fel!</span>
            ) : (
              !hasLoaded && (
                <span className="text-sm font-bold text-gray-700">
                  {translate(currentLanguage, "expandbikes") ||
                    "Klicka för att se modeller"}
                </span>
              )
            )}

            {/* Ikon för sektionsöversikt */}
            <ChevronDown
              className={`h-5 w-5 transform transition-transform ${isSectionExpanded ? "rotate-180" : "rotate-0"}`}
            />
          </div>
        </summary>

        {/* INNEHÅLL - renderas endast om sektionen är expanderad */}
        {isSectionExpanded && (
          <div className="p-4 border-t border-gray-200">
            {(isLoading || error) && (
              <p className={`p-2 ${error ? "text-red-500" : "text-gray-500"}`}>
                {error || "Laddar data..."}
              </p>
            )}

            {/* Lista med bike/quad-märken */}
            {hasLoaded && !error && brands.length > 0 && (
              <div className="mt-4">
                {brands.map(brand => (
                  <BrandItem key={brand._id} brand={brand} />
                ))}
              </div>
            )}

            {hasLoaded && !error && brands.length === 0 && (
              <p className="text-gray-500 p-2">Inga märken att visa.</p>
            )}
          </div>
        )}
      </details>
    </div>
  );
}

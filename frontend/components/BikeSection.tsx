"use client";

import {useState, useCallback, useMemo} from "react";
import {urlFor} from "@/lib/sanity";
import {ChevronDown, Loader2, ArrowRight} from "lucide-react";

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

export function BikeSection({
  setContactModalData,
  currentLanguage,
  translate,
}: BikeSectionProps) {
  const [brands, setBrands] = useState<BikeBrand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isSectionExpanded, setIsSectionExpanded] = useState(false);
  const [expandedBrandId, setExpandedBrandId] = useState<string | null>(null);
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (hasLoaded || isLoading) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bike-brands-with-models");
      if (!res.ok) throw new Error("Nätverkssvar var inte ok");
      const data = await res.json();
      setBrands(data.brands || data.result || []);
      setHasLoaded(true);
    } catch (err: any) {
      console.error("Kunde inte hämta bike/quad data", err);
      setError("Kunde inte ladda bikes/quads.");
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading]);

  const handleSectionToggle = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
    const newState = !isSectionExpanded;
    setIsSectionExpanded(newState);
    if (newState && !hasLoaded) fetchData();
    if (!newState) {
      setExpandedBrandId(null);
      setExpandedModel(null);
    }
  };

  const handleBrandToggle = (brandId: string) => {
    setExpandedBrandId(prev => (prev === brandId ? null : brandId));
    setExpandedModel(null);
  };

  const handleModelToggle = (modelName: string) => {
    setExpandedModel(prev => (prev === modelName ? null : modelName));
  };

  // Komponent för HK/NM visning
  const PerformanceDisplay = ({model}: {model: BikeModel}) => (
    <div className="space-y-2">
      {(model.origHk || model.tunedHk) && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            HK
          </span>
          <div className="flex items-center gap-2">
            {model.origHk && (
              <span className="text-sm font-bold text-gray-700">
                {model.origHk} HK
              </span>
            )}
            {model.origHk && model.tunedHk && (
              <ArrowRight className="h-3 w-3 text-gray-400" />
            )}
            {model.tunedHk && (
              <span className="text-lg font-extrabold text-green-600">
                {model.tunedHk} HK
              </span>
            )}
          </div>
        </div>
      )}

      {(model.origNm || model.tunedNm) && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            NM
          </span>
          <div className="flex items-center gap-2">
            {model.origNm && (
              <span className="text-sm font-bold text-gray-700">
                {model.origNm} NM
              </span>
            )}
            {model.origNm && model.tunedNm && (
              <ArrowRight className="h-3 w-3 text-gray-400" />
            )}
            {model.tunedNm && (
              <span className="text-lg font-extrabold text-green-600">
                {model.tunedNm} NM
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const BrandItem = useMemo(
    () =>
      ({brand}: {brand: BikeBrand}) => {
        const isExpanded = expandedBrandId === brand._id;

        // Gruppera och sortera modeller
        const groupedModels = useMemo(() => {
          const groups = brand.models.reduce(
            (acc, m) => {
              if (!acc[m.model]) acc[m.model] = {};
              if (!acc[m.model][m.year]) acc[m.model][m.year] = [];
              acc[m.model][m.year].push(m);
              return acc;
            },
            {} as Record<string, Record<string, BikeModel[]>>
          );

          // Sortera årsmodeller i fallande ordning (nyaste först) för varje modell
          Object.keys(groups).forEach(modelName => {
            const years = groups[modelName];
            const sortedYears = Object.keys(years)
              .sort((a, b) => parseInt(b) - parseInt(a))
              .reduce(
                (acc, year) => {
                  acc[year] = years[year];
                  return acc;
                },
                {} as Record<string, BikeModel[]>
              );

            groups[modelName] = sortedYears;
          });

          return groups;
        }, [brand.models]);

        // Hämta årsintervall för modell
        const getYearRange = (years: Record<string, BikeModel[]>) => {
          const yearKeys = Object.keys(years);
          if (yearKeys.length === 0) return "";
          if (yearKeys.length === 1) return yearKeys[0];

          const sortedYears = yearKeys.sort(
            (a, b) => parseInt(a) - parseInt(b)
          );
          return `${sortedYears[0]} → ${sortedYears[sortedYears.length - 1]}`;
        };

        return (
          <div
            className={`mb-4 bg-white border rounded-xl shadow-md transition duration-300 ${
              isExpanded
                ? "border-red-600 shadow-xl"
                : "border-gray-200 hover:shadow-lg"
            }`}
          >
            {/* Brand Header */}
            <div
              className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 rounded-xl"
              onClick={() => handleBrandToggle(brand._id)}
            >
              <div className="flex items-center gap-4">
                {brand.logo?.asset && (
                  <img
                    src={urlFor(brand.logo).width(60).url()}
                    alt={`${brand.name} logo`}
                    className="w-12 h-12 object-contain"
                  />
                )}
                <div className="flex flex-col">
                  <span className="text-lg font-bold text-gray-800">
                    {brand.name}
                  </span>
                </div>
              </div>
              <ChevronDown
                className={`h-5 w-5 transform transition-transform text-gray-500 ${
                  isExpanded ? "rotate-180 text-red-600" : ""
                }`}
              />
            </div>

            {isExpanded && (
              <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                {Object.entries(groupedModels).map(([modelName, years]) => {
                  const isModelExpanded = expandedModel === modelName;
                  const yearRange = getYearRange(years);

                  return (
                    <div
                      key={modelName}
                      className="border border-gray-300 rounded-lg mb-3 bg-white overflow-hidden"
                    >
                      {/* Model Header */}
                      <div
                        className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50 transition-colors"
                        onClick={() => handleModelToggle(modelName)}
                      >
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-lg">
                            {modelName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <ChevronDown
                            className={`h-5 w-5 transform transition-transform text-gray-400 ${
                              isModelExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {/* Model Content */}
                      {isModelExpanded && (
                        <div className="border-t border-gray-200">
                          {Object.entries(years).map(([year, engines]) => (
                            <div
                              key={year}
                              className="border-b border-gray-100 last:border-b-0"
                            >
                              <div className="p-4 bg-white">
                                <h4 className="text-md font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                                  {year}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                  {engines.map(engine => (
                                    <div
                                      key={engine._id}
                                      className="p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-sm hover:border-green-600 transition-colors"
                                    >
                                      {/* Motor info */}
                                      <div className="mb-3">
                                        <strong className="text-gray-900 block text-sm font-semibold">
                                          {engine.engine} - {engine.origHk} HK
                                        </strong>
                                      </div>

                                      {/* Prestanda */}
                                      <div className="mb-4 p-3 bg-white rounded border">
                                        <PerformanceDisplay model={engine} />
                                      </div>

                                      {/* Pris och kontakt */}
                                      <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                                        {engine.price ? (
                                          <p className="text-lg font-extrabold text-orange-500">
                                            {engine.price.toLocaleString(
                                              "sv-SE",
                                              {
                                                style: "currency",
                                                currency: "SEK",
                                                minimumFractionDigits: 0,
                                              }
                                            )}
                                          </p>
                                        ) : (
                                          <p className="text-xs text-gray-400">
                                            Pris saknas
                                          </p>
                                        )}

                                        <button
                                          onClick={e => {
                                            e.stopPropagation();
                                            const modalTitle = `${brand.name} ${modelName} ${year} - ${engine.engine} ${engine.origHk} HK`;
                                            setContactModalData({
                                              isOpen: true,
                                              stageOrOption: modalTitle,
                                              link: window.location.href,
                                              scrollPosition: 0,
                                            });
                                          }}
                                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 text-sm rounded-lg font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
                                        >
                                          📩{" "}
                                          {translate(
                                            currentLanguage,
                                            "contactvalue"
                                          ) || "Kontakt"}
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      },
    [
      expandedBrandId,
      expandedModel,
      setContactModalData,
      currentLanguage,
      translate,
    ]
  );

  if (brands.length === 0 && hasLoaded && !isLoading && !isSectionExpanded) {
    return null;
  }

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
          <h3 className="uppercase tracking-wide text-gray-800 text-lg font-bold">
            {translate(currentLanguage, "BIKES_QUADS") || "Bikes & Quads"}
          </h3>

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
            <ChevronDown
              className={`h-5 w-5 transform transition-transform ${
                isSectionExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </summary>

        {isSectionExpanded && (
          <div className="p-4 border-t border-gray-200">
            {(isLoading || error) && (
              <p className={`p-2 ${error ? "text-red-500" : "text-gray-500"}`}>
                {error || "Laddar data..."}
              </p>
            )}

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

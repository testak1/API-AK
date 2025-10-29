"use client";

import {useState, useCallback, memo, useMemo} from "react";
import {urlFor} from "@/lib/sanity";
import {Loader2, ChevronDown, ArrowRight} from "lucide-react";

// --- Typdefinitioner ---
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

// --- HK/NM-visning (memoiserad) ---
const ModelDisplay = memo(
  ({
    brandName,
    model,
    setContactModalData,
    currentLanguage,
    translate,
  }: {
    brandName: string;
    model: JetSkiModel;
    setContactModalData: SetContactModalData;
    currentLanguage: string;
    translate: (lang: string, key: string) => string;
  }) => {
    const handleContactClick = useCallback(() => {
      const modalTitle = `${brandName} ${model.model} [${model.year}] - ${model.engine}`;
      setContactModalData({
        isOpen: true,
        stageOrOption: modalTitle,
        link: window.location.href,
        scrollPosition: 0,
      });
    }, [brandName, model, setContactModalData]);

    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm transition hover:border-red-600">
        <strong className="text-lg font-semibold text-gray-900 block">
          {model.model} [{model.year}] – {model.engine}
        </strong>

        {(model.origHk || model.tunedHk) && (
          <div className="mt-2 mb-3 border-b border-gray-100 pb-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span className="font-semibold uppercase tracking-wider">
                {translate(currentLanguage, "originalHp") || "Original HK"}:
              </span>
              <span className="font-bold text-gray-700">{model.origHk} HK</span>
            </div>

            {model.tunedHk && (
              <div className="flex justify-between items-baseline mt-1">
                <span className="text-sm font-semibold uppercase tracking-wider text-gray-700">
                  {translate(currentLanguage, "OPPTIMERADHK") || "Optimerad HK"}
                  :
                </span>
                <span className="text-xl font-extrabold text-green-600">
                  {model.tunedHk} HK
                </span>
              </div>
            )}
          </div>
        )}

        {(model.origNm || model.tunedNm) && (
          <div className="flex items-center justify-between text-xs font-medium text-gray-500">
            <span>NM:</span>
            <div className="flex items-center gap-2">
              {model.origNm && (
                <span className="font-bold text-gray-700">{model.origNm}</span>
              )}
              {model.origNm && model.tunedNm && (
                <ArrowRight className="h-3 w-3 text-gray-400" />
              )}
              {model.tunedNm && (
                <span className="font-extrabold text-green-600">
                  {model.tunedNm}
                </span>
              )}
            </div>
          </div>
        )}

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
            onClick={handleContactClick}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm rounded-lg font-bold transition focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            📩 {translate(currentLanguage, "contactvalue") || "Kontakt"}
          </button>
        </div>
      </div>
    );
  }
);
ModelDisplay.displayName = "ModelDisplay";

// --- Varumärke (memoiserad) ---
const JetSkiBrandItem = memo(
  ({
    brand,
    setContactModalData,
    currentLanguage,
    translate,
  }: {
    brand: JetSkiBrand;
    setContactModalData: SetContactModalData;
    currentLanguage: string;
    translate: (lang: string, key: string) => string;
  }) => {
    const models = useMemo(() => brand.models, [brand.models]);
    return (
      <details className="mb-4 bg-white border border-gray-200 rounded-xl shadow-md transition hover:shadow-lg group">
        <summary
          className="cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
          style={{listStyle: "none"}}
        >
          <div className="flex items-center gap-4">
            {brand.logo?.asset && (
              <img
                src={urlFor(brand.logo).width(60).url()}
                alt={`${brand.name} logo`}
                className="w-12 h-12 object-contain"
                loading="lazy"
              />
            )}
            <span className="text-lg font-bold text-gray-800">
              {brand.name}
            </span>
          </div>
          <ChevronDown className="h-5 w-5 text-gray-500 transition-transform group-open:rotate-180" />
        </summary>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {models.map(model => (
                <ModelDisplay
                  key={model._id}
                  brandName={brand.name}
                  model={model}
                  setContactModalData={setContactModalData}
                  currentLanguage={currentLanguage}
                  translate={translate}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 p-2">
              Inga modeller hittades för detta märke.
            </p>
          )}
        </div>
      </details>
    );
  }
);
JetSkiBrandItem.displayName = "JetSkiBrandItem";

// --- Huvudkomponent ---
export function JetSkiSection({
  setContactModalData,
  currentLanguage,
  translate,
}: JetSkiSectionProps) {
  const [brands, setBrands] = useState<JetSkiBrand[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    if (hasLoaded || isLoading) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/jetski-brands");
      if (!res.ok) throw new Error("Network error");
      const data = await res.json();
      setBrands(data.brands || []);
      setHasLoaded(true);
    } catch (err) {
      console.error("Kunde inte hämta vattenskoterdata", err);
      setError("Kunde inte ladda vattenskotrar.");
    } finally {
      setIsLoading(false);
    }
  }, [hasLoaded, isLoading]);

  const handleToggle = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      e.preventDefault();
      setIsExpanded(prev => {
        const newState = !prev;
        if (newState && !hasLoaded) fetchData();
        return newState;
      });
    },
    [hasLoaded, fetchData]
  );

  if (brands.length === 0 && hasLoaded && !isLoading) return null;

  return (
    <div className="mt-8 mb-6">
      <details
        className="bg-white border border-gray-300 rounded-xl shadow-lg"
        open={isExpanded}
      >
        <summary
          className="cursor-pointer p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl"
          style={{listStyle: "none"}}
          onClick={handleToggle}
        >
          <h3 className="uppercase tracking-wide text-gray-800 text-lg font-bold">
            {translate(currentLanguage, "JETSKI") || "Vattenskotrar"}
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
                  {translate(currentLanguage, "expandjetski") ||
                    "Klicka för att se modeller"}
                </span>
              )
            )}
            <ChevronDown
              className={`h-5 w-5 transform transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            />
          </div>
        </summary>

        {isExpanded && (
          <div className="p-4 border-t border-gray-200">
            {(isLoading || error) && (
              <p className={`p-2 ${error ? "text-red-500" : "text-gray-500"}`}>
                {error || "Laddar data..."}
              </p>
            )}

            {hasLoaded && !error && brands.length > 0
              ? brands.map(brand => (
                  <JetSkiBrandItem
                    key={brand._id}
                    brand={brand}
                    setContactModalData={setContactModalData}
                    currentLanguage={currentLanguage}
                    translate={translate}
                  />
                ))
              : hasLoaded &&
                !error && (
                  <p className="text-gray-500 p-2">Inga märken att visa.</p>
                )}
          </div>
        )}
      </details>
    </div>
  );
}

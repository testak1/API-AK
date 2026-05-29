// components/RegnrSearch.tsx
import React, { useState, useEffect, useRef } from "react";

interface Vehicle {
  brand: string;
  model: string;
  year: string;
  fuel: string;
  powerHp: string;
  engineCm3: string;
}

type OnVehicleFound = (vehicle: Vehicle) => void;
type OnError = (message: string | null) => void;
type OnOpen = () => void;

interface RegnrSearchProps {
  onVehicleFound: OnVehicleFound;
  onError: OnError;
  disabled: boolean;
  onOpen?: OnOpen;
}

const SWEDISH_REG_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/;

function extractVehicleData(htmlContent: string): Vehicle {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, "text/html");

  const summarySection = doc.querySelector("section#summary");
  const technicalDataSection = doc.querySelector("section#technical-data");

  if (!summarySection) {
    throw new Error("Kunde inte hitta fordonsinformation på sidan.");
  }

  const h1 = summarySection.querySelector<HTMLElement>(".bar.summary .info h1");
  const iconGrid = summarySection.querySelector<HTMLElement>("ul.icon-grid");

  if (!h1 || !iconGrid) {
    throw new Error("Kunde inte läsa ut fordonsinformation.");
  }

  const fullName = h1.innerText.trim();
  const brand = fullName.split(" ")[0] || "";
  const model = fullName.substring(brand.length).trim();

  const findGridValue = (labelSelector: string): string | null => {
    const items = Array.from(iconGrid.querySelectorAll("li"));
    for (const item of items) {
      const label = item.querySelector("span")?.innerText.trim().toLowerCase();
      if (label === labelSelector) {
        return item.querySelector("em")?.innerText.trim() || null;
      }
    }
    return null;
  };

  const rawYear = findGridValue("modellår");
  const rawFuel = findGridValue("bränsle");
  const rawPower = findGridValue("hästkrafter");

  const year = rawYear?.match(/\d{4}/)?.[0] || null;
  const fuel = rawFuel || null;
  const powerHp = rawPower?.match(/(\d+)/)?.[0] || null;

  let engineCm3: string | null = null;
  if (technicalDataSection) {
    const techItems = Array.from(technicalDataSection.querySelectorAll(".inner ul.list li"));
    for (const item of techItems) {
      const label = item.querySelector<HTMLElement>("span.label")?.innerText.trim().toLowerCase();
      if (label === "motorvolym") {
        const value = item.querySelector<HTMLElement>("span.value")?.innerText.trim();
        engineCm3 = value?.match(/(\d+)/)?.[0] || null;
        break;
      }
    }
  }

  if (!brand || !model || !year || !fuel || !powerHp || !engineCm3) {
    const missing = [
      !brand && "Märke/Modell",
      !year && "År",
      !fuel && "Bränsle",
      !powerHp && "Effekt",
      !engineCm3 && "Motorvolym",
    ]
      .filter(Boolean)
      .join(", ");
    throw new Error(`Kunde inte extrahera följande fält: ${missing}.`);
  }

  return { brand, model, year, fuel, powerHp, engineCm3 };
}

export default function RegnrSearch({
  onVehicleFound,
  onError,
  disabled,
  onOpen,
}: RegnrSearchProps) {
  const [regnr, setRegnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasOpened = useRef(false);

  useEffect(() => {
    if (regnr.length === 6 && !SWEDISH_REG_REGEX.test(regnr)) {
      setError("Ogiltigt registreringsnummer (format: ABC12D).");
    } else {
      setError(null);
    }
  }, [regnr]);

  const handleToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open && !hasOpened.current && onOpen) {
      onOpen();
      hasOpened.current = true;
    }
  };

  const handleSearch = async () => {
    const formattedRegnr = regnr.toUpperCase().replace(/\s/g, "");
    if (!formattedRegnr) return;

    if (!SWEDISH_REG_REGEX.test(formattedRegnr)) {
      const message = "Ogiltigt registreringsnummer (format: ABC12D).";
      setError(message);
      onError(message);
      return;
    }

    setIsLoading(true);
    setError(null);
    onError(null);

    const targetUrl = `${process.env.NEXT_PUBLIC_REGNR_URL}/fordon/${formattedRegnr}`;
    const proxyUrl = `${process.env.NEXT_PUBLIC_CORS_PROXY_URL}/?key=${process.env.NEXT_PUBLIC_CORS_PROXY_KEY}&url=${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Nätverksfel (Status: ${response.status}). Biluppgifter kunde inte hämtas.`);
      }

      const htmlContent = await response.text();
      const vehicleData = extractVehicleData(htmlContent);
      onVehicleFound(vehicleData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Ett okänt fel uppstod.";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <details
      className="max-w-xl mx-auto mb-8 rounded-2xl bg-gradient-to-b from-gray-900 via-gray-900 to-black border border-gray-800 shadow-2xl group overflow-hidden transition-all duration-300 hover:border-gray-700"
      onToggle={handleToggle}
    >
      {/* Harmonisk och modern rubrikbar */}
      <summary className="appearance-none marker:hidden p-5 flex justify-between items-center cursor-pointer list-none select-none bg-gray-950/40 hover:bg-gray-800/30 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20 text-red-500 group-open:bg-red-500 group-open:text-white transition-all duration-300">
            <svg
              className="h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-gray-100 text-sm font-bold tracking-wider uppercase font-sans">
              Slå upp fordon automatiskt
            </span>
            <span className="text-gray-400 text-xs mt-0.5">
              Hämta specifikationer via registreringsnummer <span className="text-red-400 font-mono text-[10px] uppercase bg-red-500/10 px-1 py-0.5 rounded border border-red-500/20 ml-1">Beta</span>
            </span>
          </div>
        </div>
        <div className="p-1.5 rounded-lg bg-gray-800/40 text-gray-500 group-open:rotate-180 transition-transform duration-300">
          <svg
            className="w-4 h-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </summary>

      {/* Innehållsboxen */}
      <div className="p-6 border-t border-gray-800/80 bg-gray-950/20 space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          
          {/* REGISTRERINGSSKYLT-LOOK INPUT */}
          <div className="relative flex-grow flex items-center rounded-xl bg-white shadow-inner overflow-hidden border border-gray-300 focus-within:ring-2 focus-within:ring-red-500/50 focus-within:border-red-500 transition-all duration-200">
            
            {/* Blå EU-märkning till vänster */}
            <div className="self-stretch bg-[#003399] w-7 flex flex-col items-center justify-between py-2 text-white select-none">
              <div className="flex flex-col items-center gap-0.5">
                {/* Små enkla stjärnor (eller prickar) i ring */}
                <div className="text-[7px] leading-none text-yellow-400 font-bold">★</div>
              </div>
              <span className="text-xs font-bold font-sans tracking-tighter text-white/90 leading-none">S</span>
            </div>

            {/* Själva textfältet (Ser ut som en äkta skylt) */}
            <input
              type="text"
              value={regnr}
              onChange={(e) => setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="ABC 12D"
              maxLength={6}
              className="w-full pl-4 pr-10 py-3.5 bg-transparent text-gray-900 placeholder-gray-400 focus:outline-none text-center text-2xl font-bold font-mono tracking-[0.3em] disabled:opacity-50 disabled:cursor-not-allowed uppercase"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disabled && !isLoading) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              disabled={disabled || isLoading}
            />

            {/* Spinner inuti skylten om databasen laddar externt */}
            {disabled && (
              <div className="absolute right-3">
                <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          {/* SÖKKNAPP */}
          <button
            onClick={handleSearch}
            disabled={disabled || isLoading || regnr.length < 6}
            className="px-8 py-3.5 bg-red-600 hover:bg-red-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:border-gray-700/50 disabled:cursor-not-allowed border border-red-500/10 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-600/10 flex items-center justify-center min-w-[140px] active:scale-[0.98]"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span className="text-sm tracking-wide">Hämtar...</span>
              </div>
            ) : (
              <span className="text-sm tracking-wide">Sök Fordon</span>
            )}
          </button>
        </div>

        {/* Status vid initiering av sökmotor */}
        {disabled && (
          <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-gray-900/40 border border-gray-800 text-xs text-gray-400 animate-pulse">
            <div className="animate-spin h-3 w-3 border-2 border-red-500 border-t-transparent rounded-full"></div>
            <span>Synkar mot databassystem... Vänligen vänta.</span>
          </div>
        )}

        {/* Snyggare och mer integrerad felmeddelande-ruta */}
        {error && (
          <div className="flex items-start gap-2.5 mt-2 text-sm text-red-400 bg-red-950/20 p-3 rounded-xl border border-red-500/20 font-medium animate-fadeIn">
            <svg className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}
      </div>
    </details>
  );
}

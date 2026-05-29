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

// Regex för svensk registreringsskylt (3 bokstäver, 2 siffror, 1 siffra/bokstav)
const SWEDISH_REG_REGEX = /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/;

/**
 * Hjälpfunktion för att extrahera fordonsdata ur den skrapade HTML-strängen
 */
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

  // Extrahera märke och modell
  const fullName = h1.innerText.trim();
  const brand = fullName.split(" ")[0] || "";
  const model = fullName.substring(brand.length).trim();

  // Helper för att hitta värden i listor baserat på textinnehåll
  const findGridValue = (labelSelector: string): string | null => {
    const items = Array.from(iconGrid.querySelectorAll("li"));
    for (const item of items) {
      const label = item.querySelector("span")?.innerText.trim().toLowerCase();
      if (label === labelSelector) {
        return item.querySelector("em")?.innerText.trim() || null;
      }
    }
    return null;
  }

  const rawYear = findGridValue("modellår");
  const rawFuel = findGridValue("bränsle");
  const rawPower = findGridValue("hästkrafter");

  const year = rawYear?.match(/\d{4}/)?.[0] || null;
  const fuel = rawFuel || null;
  const powerHp = rawPower?.match(/(\d+)/)?.[0] || null;

  // Extrahera motorvolym från teknisk data
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

  // Validera att vi fick med allt
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

  // Validera formatet (men varna bara om användaren skrivit in 6 tecken så vi inte stör mitt i skrivandet)
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
      className="max-w-md mx-auto mb-8 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-lg group overflow-hidden transition-all"
      onToggle={handleToggle}
    >
      <summary className="appearance-none marker:hidden p-4 flex justify-between items-center cursor-pointer list-none select-none transition-all hover:bg-gray-800/50">
        <div className="flex items-center gap-3">
          <svg
            className="h-5 w-5 text-red-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-white text-base font-semibold tracking-wide uppercase">
            Sök med regnr <span className="text-xs text-red-400 font-normal lowercase">[beta]</span>
          </span>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 transform transition-transform duration-300 group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="p-4 border-t border-gray-700/60 bg-gray-950/40">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Input-container med relativ positionering för spinnaren */}
          <div className="relative flex-grow">
            <input
              type="text"
              value={regnr}
              onChange={(e) => setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="ABC123"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg font-mono tracking-widest disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disabled && !isLoading) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              disabled={disabled || isLoading}
            />
            {/* Korrekt placerad loader inuti input-fältet vid yttre laddning */}
            {disabled && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={disabled || isLoading || regnr.length < 6}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center min-w-[120px] active:scale-95"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Söker...</span>
              </div>
            ) : (
              "Sök fordon"
            )}
          </button>
        </div>

        {/* Statusmeddelande för databasladdning */}
        {disabled && (
          <div className="flex items-center justify-center gap-2 mt-4 text-xs text-gray-400 bg-gray-800/30 py-1.5 rounded-md">
            <div className="animate-spin h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full"></div>
            <span>Initierar sökmotor...</span>
          </div>
        )}

        {error && (
          <p className="text-red-400 mt-3 text-center text-sm font-medium bg-red-500/10 py-2 px-3 rounded-lg border border-red-500/20">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}

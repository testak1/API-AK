import React, { useState, useEffect, useRef } from "react";

type OnVehicleFound = (vehicle: {
  brand: string;
  model: string;
  year: string;
  fuel: string;
  powerHp: string;
  engineCm3: string;
}) => void;

type OnError = (message: string | null) => void;
type OnOpen = () => void;

export default function RegnrSearch({
  onVehicleFound,
  onError,
  disabled,
  onOpen,
}: {
  onVehicleFound: OnVehicleFound;
  onError: OnError;
  disabled: boolean;
  onOpen?: OnOpen;
}) {
  const [regnr, setRegnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasOpened = useRef(false);

  // Validerar formatet ABC123 eller ABC12D
  const isValidSwedishReg = (reg: string) =>
    /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/.test(reg);

  useEffect(() => {
    if (regnr && !isValidSwedishReg(regnr)) {
      setError("Ogiltigt registreringsnummer (format: ABC123).");
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
    if (!regnr || disabled) return;

    const formattedRegnr = regnr.toUpperCase().replace(/\s/g, "");

    if (!isValidSwedishReg(formattedRegnr)) {
      const message = "Ogiltigt registreringsnummer.";
      setError(message);
      onError(message);
      return;
    }

    setIsLoading(true);
    setError(null);
    onError(null);

    try {
      // Anropar din lokala API-route
      const response = await fetch(`/api/proxy-vehicle?reg=${formattedRegnr}`);
      
      if (!response.ok) {
        throw new Error("Kunde inte hitta fordonet. Kontrollera regnr.");
      }

      const htmlContent = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // 1. Märke och Modell från H1
      const h1 = doc.querySelector("h1");
      if (!h1) throw new Error("Kunde inte läsa fordonsdata.");
      
      const fullName = h1.innerText.trim();
      const brand = fullName.split(" ")[0];
      const model = fullName.substring(brand.length).trim();

      // 2. Tekniska specifikationer
      let year = "";
      let fuel = "";
      let powerHp = "";
      let engineCm3 = "";

      // Vi letar i alla list-element (ul.list li) efter etiketter (span.label)
      const listItems = doc.querySelectorAll("ul.list li");
      listItems.forEach((item) => {
        const label = item.querySelector(".label")?.textContent?.trim().toLowerCase() || "";
        const value = item.querySelector(".value")?.textContent?.trim() || "";

        if (label.includes("modellår")) {
          year = value.match(/\d{4}/)?.[0] || "";
        } else if (label.includes("bränsle")) {
          fuel = value;
        } else if (label.includes("effekt") || label.includes("hästkrafter")) {
          powerHp = value.match(/(\d+)\s*hk/)?.[1] || value.match(/(\d+)/)?.[0] || "";
        } else if (label.includes("motorvolym")) {
          // Tar bort mellanslag i t.ex. "3 982"
          engineCm3 = value.replace(/\s/g, "").match(/(\d+)/)?.[0] || "";
        }
      });

      // Kontrollera att vi har tillräckligt med data
      if (!brand || !year || !powerHp) {
        throw new Error("Viss fordonsdata saknas på Biluppgifter.");
      }

      onVehicleFound({
        brand,
        model,
        year,
        fuel: fuel || "Bensin/Diesel",
        powerHp,
        engineCm3: engineCm3 || "0"
      });

    } catch (err: any) {
      const msg = err.message || "Ett fel uppstod";
      setError(msg);
      onError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <details
      className="max-w-md mx-auto mb-8 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-lg group overflow-hidden"
      onToggle={handleToggle}
    >
      <summary className="appearance-none marker:hidden p-4 flex justify-between items-center cursor-pointer list-none select-none transition-all hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-white text-lg font-semibold tracking-wide uppercase">
            Sök med regnr <span className="text-xs text-red-400 font-normal">[BETA]</span>
          </span>
        </div>
        <svg className="w-5 h-5 text-gray-400 transform transition-transform duration-300 group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>

      <div className="p-4 border-t border-gray-700 bg-gray-900/70">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={regnr}
              onChange={(e) => setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))}
              placeholder="ABC 123"
              maxLength={6}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg font-mono tracking-widest disabled:opacity-50 transition-all"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !disabled) {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              disabled={disabled || isLoading}
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-red-500 border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>

          <button
            onClick={handleSearch}
            disabled={disabled || isLoading || regnr.length < 6}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-400 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center min-w-[120px]"
          >
            {isLoading ? "Söker..." : "Hämta bil"}
          </button>
        </div>

        {error && (
          <p className="text-red-400 mt-3 text-center text-sm font-medium bg-red-900/20 py-2 rounded border border-red-900/50">
            {error}
          </p>
        )}
        
        <p className="text-gray-500 text-[10px] mt-4 text-center leading-tight">
          Genom att söka godkänner du att fordonsdata hämtas externt.<br/>
          Alla tekniska specifikationer bör verifieras manuellt.
        </p>
      </div>
    </details>
  );
}

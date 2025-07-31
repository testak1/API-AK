// components/RegnrSearch.tsx
import React, { useState } from "react";

type OnVehicleFound = (vehicle: {
  brand: string;
  model: string;
  year: string;
  fuel: string;
  powerHp: string;
  engineCm3: string;
}) => void;

type OnError = (message: string | null) => void;

export default function RegnrSearch({
  onVehicleFound,
  onError,
  disabled,
}: {
  onVehicleFound: OnVehicleFound;
  onError: OnError;
  disabled: boolean;
}) {
  const [regnr, setRegnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!regnr || disabled) return;
    setIsLoading(true);
    setError(null);
    onError(null);

    const targetUrl = `https://biluppgifter.se/fordon/${regnr.toUpperCase()}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) {
        throw new Error(`Nätverksfel (Status: ${response.status}).`);
      }

      const htmlContent = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      const summarySection = doc.querySelector("section#summary");
      const technicalDataSection = doc.querySelector("section#technical-data");

      if (!summarySection) {
        throw new Error(
          "Kunde inte hitta sammanfattningssektionen (#summary) på sidan.",
        );
      }

      // KORRIGERAD, MER SPECIFIK SELEKTOR FÖR H1
      const h1 = summarySection.querySelector<HTMLElement>(
        ".bar.summary .info h1",
      );
      const iconGrid =
        summarySection.querySelector<HTMLElement>("ul.icon-grid");

      if (!h1 || !iconGrid) {
        throw new Error(
          "Kunde inte hitta H1-taggen eller ikongrid-listan inuti #summary.",
        );
      }

      const fullName = h1.innerText.trim();
      const brand = fullName.split(" ")[0];
      const model = fullName.substring(brand.length).trim();

      let year: string | null = null;
      let fuel: string | null = null;
      let powerHp: string | null = null;
      iconGrid.querySelectorAll("li").forEach((item) => {
        const label = item
          .querySelector<HTMLElement>("span")
          ?.innerText.trim()
          .toLowerCase();
        const value = item.querySelector<HTMLElement>("em")?.innerText.trim();
        if (label === "modellår") year = value?.match(/\d{4}/)?.[0] || null;
        if (label === "bränsle") fuel = value || null;
        if (label === "hästkrafter")
          powerHp = value?.match(/(\d+)/)?.[0] || null;
      });

      let engineCm3: string | null = null;
      if (technicalDataSection) {
        technicalDataSection
          .querySelectorAll(".inner ul.list li")
          .forEach((item) => {
            const label = item
              .querySelector<HTMLElement>("span.label")
              ?.innerText.trim()
              .toLowerCase();
            if (label === "motorvolym") {
              const value = item
                .querySelector<HTMLElement>("span.value")
                ?.innerText.trim();
              engineCm3 = value?.match(/(\d+)/)?.[0] || null;
            }
          });
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
        throw new Error(`Kunde inte extrahera: ${missing}.`);
      }

      onVehicleFound({ brand, model, year, fuel, powerHp, engineCm3 });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Ett okänt fel uppstod.";
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <details className="mb-8 bg-gray-900/80 border border-gray-700 rounded-xl group backdrop-blur-sm transition-all hover:bg-gray-900/90">
      <summary className="p-5 cursor-pointer flex justify-between items-center list-none">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-600/20 rounded-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div>
            <span className="font-bold text-white text-lg">SÖK MED REGNR</span>

            <span className="ml-2 px-2 py-0.5 bg-red-600/30 text-red-300 text-xs rounded-full">
              BETA
            </span>
          </div>
        </div>
        <svg
          className="w-6 h-6 text-gray-400 transform transition-transform duration-200 group-open:rotate-180"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </summary>
      <div className="px-5 pb-5 border-t border-gray-700/50">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-grow">
            <input
              type="text"
              value={regnr}
              onChange={(e) =>
                setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))
              }
              placeholder={disabled ? "Laddar databas..." : "ABC 123"}
              className="w-full p-4 rounded-xl bg-gray-800/70 border border-gray-600/50 text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-center text-lg font-mono tracking-widest disabled:opacity-50 hover:bg-gray-800/90"
              onKeyDown={(e) =>
                e.key === "Enter" && !disabled && handleSearch()
              }
              disabled={disabled || isLoading}
              maxLength={6}
            />
            {!regnr && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-gray-500 font-mono tracking-widest">
                  ABC 123
                </span>
              </div>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={disabled || isLoading}
            className="p-4 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-red-500/20 disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center justify-center gap-2 min-w-[120px]"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                <span>Söker...</span>
              </>
            ) : (
              <>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <span>Sök fordon</span>
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-center animate-fade-in">
            {error}
          </div>
        )}
      </div>
    </details>
  );
}

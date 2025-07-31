// components/RegnrSearch.tsx
import React, { useState, useEffect } from "react";

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
  const isValidSwedishReg = (reg: string) =>
    /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/.test(reg);

  useEffect(() => {
    if (regnr && !isValidSwedishReg(regnr)) {
      setError("Ogiltigt registreringsnummer (format: ABC12D).");
    } else {
      setError(null);
    }
  }, [regnr]);

  const handleSearch = async () => {
    if (!regnr || disabled) return;

    const formattedRegnr = regnr.toUpperCase().replace(/\s/g, "");

    if (!isValidSwedishReg(formattedRegnr)) {
      const message = "Ogiltigt registreringsnummer (format: ABC12D).";
      setError(message);
      onError(message);
      return;
    }

    setIsLoading(true);
    setError(null);
    onError(null);

    const targetUrl = `https://biluppgifter.se/fordon/${formattedRegnr}`;
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
        throw new Error("Kunde inte hitta slutföra.");
      }

      // KORRIGERAD, MER SPECIFIK SELEKTOR FÖR H1
      const h1 = summarySection.querySelector<HTMLElement>(
        ".bar.summary .info h1",
      );
      const iconGrid =
        summarySection.querySelector<HTMLElement>("ul.icon-grid");

      if (!h1 || !iconGrid) {
        throw new Error("Kunde inte slutföra.");
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
    <details className="max-w-md mx-auto mb-8 rounded-xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 shadow-lg group overflow-hidden">
      <summary className="p-4 flex justify-between items-center cursor-pointer list-none select-none transition-all hover:bg-gray-800">
        <div className="flex items-center gap-3">
          <svg
            className="h-6 w-6 text-red-400"
            xmlns="http://www.w3.org/2000/svg"
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
          <span className="text-white text-lg font-semibold tracking-wide">
            SÖK MED REGNR <span className="text-sm text-red-400">(BETA)</span>
          </span>
        </div>
        <svg
          className="w-5 h-5 text-gray-400 transform transition-transform duration-300 group-open:rotate-180"
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

      <div className="p-4 border-t border-gray-700 bg-gray-900/70">
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={regnr}
            onChange={(e) =>
              setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))
            }
            placeholder={disabled ? "Laddar databas..." : "ABC123"}
            className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-600 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 text-center text-lg font-mono tracking-widest disabled:opacity-50 transition-all"
            onKeyDown={(e) => e.key === "Enter" && !disabled && handleSearch()}
            disabled={disabled || isLoading}
          />

          <button
            onClick={handleSearch}
            disabled={disabled || isLoading}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
            ) : (
              "Sök fordon"
            )}
          </button>
        </div>

        {error && (
          <p className="text-red-400 mt-3 text-center text-sm">{error}</p>
        )}
      </div>
    </details>
  );
}

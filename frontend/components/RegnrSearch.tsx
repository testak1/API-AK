// components/RegnrSearch.tsx
import React, { useState } from "react";

type OnVehicleFound = (vehicle: {
  brand: string;
  model: string;
  year: string;
}) => void;
type OnError = (message: string | null) => void;

export default function RegnrSearch({
  onVehicleFound,
  onError,
}: {
  onVehicleFound: OnVehicleFound;
  onError: OnError;
}) {
  const [regnr, setRegnr] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!regnr) return;
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

      // --- NY, KORREKT LOGIK ---
      // Leta efter den primära informationsrutan högst upp på sidan.
      const summarySection = doc.querySelector(
        "section#summary .bar.summary .info",
      );
      const iconGrid = doc.querySelector("section#summary ul.icon-grid");

      if (!summarySection || !iconGrid) {
        throw new Error(
          "Kunde inte hitta huvudinformationen på sidan. Strukturen kan ha ändrats.",
        );
      }

      // 1. Hämta Märke och Modell från H1-taggen
      const h1 = summarySection.querySelector("h1");
      if (!h1) {
        throw new Error("Kunde inte hitta H1-taggen med bilens namn.");
      }

      const fullName = h1.innerText.trim();
      const brand = fullName.split(" ")[0]; // Tar första ordet som märke (t.ex. "Volkswagen")
      const model = fullName.substring(brand.length).trim(); // Tar resten som modell (t.ex. "Passat")

      // 2. Hämta Årsmodell från informationsrutorna
      let year = null;
      const listItems = iconGrid.querySelectorAll("li");
      listItems.forEach((item) => {
        const label = item.querySelector("span");
        if (label && label.innerText.trim().toLowerCase() === "modellår") {
          const value = item.querySelector("em");
          if (value) {
            year = value.innerText.trim().match(/\d{4}/)?.[0] || null; // Extrahera bara årtalet
          }
        }
      });

      if (!brand || !model || !year) {
        console.error({ brand, model, year });
        throw new Error(
          "Kunde inte extrahera all nödvändig information (Märke, Modell, År).",
        );
      }

      // Allt lyckades, skicka tillbaka datan!
      onVehicleFound({ brand, model, year });
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
    <div className="bg-gray-900 p-6 rounded-lg shadow-lg mb-8 border border-gray-700">
      <h2 className="text-xl font-bold text-white mb-4 text-center">
        Sök med registreringsnummer
      </h2>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={regnr}
          onChange={(e) =>
            setRegnr(e.target.value.toUpperCase().replace(/\s/g, ""))
          }
          placeholder="ABC 123"
          className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-center text-lg font-mono tracking-widest"
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            "Sök fordon"
          )}
        </button>
      </div>
      {error && <p className="text-red-400 mt-3 text-center">{error}</p>}
    </div>
  );
}

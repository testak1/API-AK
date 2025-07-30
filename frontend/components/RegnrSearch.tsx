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
    onError(null); // Rensa tidigare felmeddelanden

    const targetUrl = `https://biluppgifter.se/fordon/${regnr.toUpperCase()}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
      // Anropet görs nu direkt från webbläsaren, precis som i ditt felkod-projekt
      const response = await fetch(proxyUrl);

      if (!response.ok) {
        throw new Error(
          `Nätverksfel: Kunde inte anropa proxyn (status: ${response.status}).`,
        );
      }

      const htmlContent = await response.text();

      // Skapa ett tillfälligt DOM-element för att tolka HTML-svaret
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      // Funktion för att säkert extrahera text
      const getText = (selector: string) => {
        const element = doc.querySelector(selector);
        return element ? (element as HTMLElement).innerText.trim() : null;
      };

      // Hitta värdena baserat på deras rubriker (<th>)
      const tableRows = doc.querySelectorAll("table.table-bordered tr");
      let vehicleData: { [key: string]: string } = {};

      tableRows.forEach((row) => {
        const th = row.querySelector("th");
        const td = row.querySelector("td");
        if (th && td) {
          const key = th.innerText.trim();
          const value = td.innerText.trim();
          if (key === "Fabrikat") vehicleData.brand = value;
          if (key === "Modell") vehicleData.model = value;
          if (key === "Fordonsår") vehicleData.year = value;
        }
      });

      const { brand, model, year } = vehicleData;

      if (!brand || !model || !year) {
        throw new Error(
          "Kunde inte hitta all fordonsinformation. Sidans struktur kan ha ändrats.",
        );
      }

      // Skicka tillbaka den hittade datan
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

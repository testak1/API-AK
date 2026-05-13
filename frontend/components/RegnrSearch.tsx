// components/RegnrSearch.tsx
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

  const isValidSwedishReg = (reg: string) =>
    /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/.test(reg);

  const handleSearch = async () => {
    if (!regnr || disabled) return;
    const formattedRegnr = regnr.toUpperCase().replace(/\s/g, "");

    if (!isValidSwedishReg(formattedRegnr)) {
      setError("Ogiltigt format (t.ex. ABC123)");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/proxy-vehicle?reg=${formattedRegnr}`);
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Kunde inte hämta data.");
      }

      // Om vi inte fick JSON (utan HTML), så fortsätter vi
      const htmlContent = typeof data === 'string' ? data : await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");

      const h1 = doc.querySelector("h1");
      if (!h1 || h1.innerText.includes("Hittade inte")) {
        throw new Error("Fordonet hittades inte.");
      }

      const fullName = h1.innerText.trim();
      const brand = fullName.split(" ")[0];
      const model = fullName.substring(brand.length).trim();

      let year = "", fuel = "", powerHp = "", engineCm3 = "";

      doc.querySelectorAll("ul.list li").forEach((item) => {
        const label = item.querySelector(".label")?.textContent?.trim().toLowerCase() || "";
        const value = item.querySelector(".value")?.textContent?.trim() || "";

        if (label.includes("modellår")) year = value.match(/\d{4}/)?.[0] || "";
        else if (label.includes("bränsle")) fuel = value;
        else if (label.includes("effekt")) powerHp = value.match(/(\d+)/)?.[0] || "";
        else if (label.includes("motorvolym")) engineCm3 = value.replace(/\s/g, "").match(/(\d+)/)?.[0] || "";
      });

      onVehicleFound({ brand, model, year, fuel, powerHp, engineCm3 });
    } catch (err: any) {
      setError(err.message);
      onError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <details className="max-w-md mx-auto mb-8 rounded-xl bg-gray-900 border border-gray-700 overflow-hidden shadow-2xl">
      <summary className="p-4 flex justify-between items-center cursor-pointer list-none hover:bg-gray-800 transition-colors">
        <span className="text-white font-bold tracking-widest">SÖK REGNR <span className="text-red-500 text-xs">[BETA]</span></span>
        <div className={`w-3 h-3 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
      </summary>
      <div className="p-4 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={regnr}
            onChange={(e) => setRegnr(e.target.value.toUpperCase())}
            className="flex-grow bg-gray-800 border border-gray-600 p-3 rounded text-white text-center font-mono text-xl"
            placeholder="ABC 123"
            maxLength={6}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="bg-red-600 text-white px-6 rounded font-bold hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "..." : "SÖK"}
          </button>
        </div>
        {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
      </div>
    </details>
  );
}

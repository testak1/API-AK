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

    try {
      const response = await fetch("/api/regnr-lookup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ regnr: formattedRegnr }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Nätverksfel (Status: ${response.status}).`,
        );
      }

      const vehicleData = await response.json();
      onVehicleFound(vehicleData);
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
      <summary className="appearance-none marker:hidden p-4 flex justify-between items-center cursor-pointer list-none select-none transition-all hover:bg-gray-800">
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

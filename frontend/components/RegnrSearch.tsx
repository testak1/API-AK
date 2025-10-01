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
  
  // Ref för att säkerställa att databasen bara laddas en gång
  const hasTriggeredLoad = useRef(false);

  const isValidSwedishReg = (reg: string) =>
    /^[A-Z]{3}\d{2}[A-Z0-9]{1}$/.test(reg);

  useEffect(() => {
    // Validera registreringsnumret löpande
    if (regnr && !isValidSwedishReg(regnr)) {
      setError("Ogiltigt registreringsnummer (format: ABC12D).");
    } else {
      setError(null);
    }
  }, [regnr]);

  // Funktion som anropas när användaren interagerar med sökfältet
  const handleFocus = () => {
    // Anropa onOpen (som laddar databasen) BARA om det inte redan har gjorts.
    if (onOpen && !hasTriggeredLoad.current) {
      onOpen();
      hasTriggeredLoad.current = true;
    }
  };

  const handleSearch = async () => {
    if (!regnr || !isValidSwedishReg(regnr)) {
      onError("Ange ett giltigt registreringsnummer.");
      return;
    }
    setIsLoading(true);
    onError(null);
    try {
      const response = await fetch(
        `https://api.biluppgifter.se/api/v1/vehicle/regno/${regnr}?api_token=${process.env.NEXT_PUBLIC_BILUPPGIFTER_API_KEY}`
      );
      if (!response.ok) {
        throw new Error("Kunde inte hämta fordonsdata.");
      }
      const data = await response.json();
      const vehicleData = {
        brand: data.data.basic.data.make,
        model: data.data.basic.data.model,
        year: data.data.basic.data.model_year,
        fuel: data.data.technical.data.fuel1,
        powerHp: data.data.technical.data.engine_power_hp,
        engineCm3: data.data.technical.data.cylinder_volume,
      };
      onVehicleFound(vehicleData);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Ett okänt fel uppstod.";
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center gap-2">
        <div className="relative flex-grow">
          <input
            type="text"
            value={regnr}
            onChange={(e) => setRegnr(e.target.value.toUpperCase())}
            onFocus={handleFocus} // Ladda databasen när fältet får fokus
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="ABC 123"
            className={`w-full p-3 pr-12 text-center text-lg font-bold tracking-[.2em] uppercase bg-gray-800 border-2 rounded-lg text-white transition-all focus:outline-none ${
              error
                ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                : "border-gray-600 focus:border-red-500 focus:ring-red-500"
            }`}
            disabled={disabled}
          />
          {disabled && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>

        <button
          onClick={handleSearch}
          onFocus={handleFocus} // Ladda databasen även om man tabbar till knappen
          disabled={disabled || isLoading || !!error}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center min-w-[120px]"
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

      {disabled && (
        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-gray-400">
          <div className="animate-spin h-3 w-3 border-2 border-red-400 border-t-transparent rounded-full"></div>
          <span>Initierar sökmotor...</span>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-xs mt-2 text-center">{error}</p>
      )}
    </div>
  );
}

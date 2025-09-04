// components/FuelSavingCalculator.tsx
import React, { useState, useMemo } from "react";
import { t } from "@/lib/translations";
import type { Stage } from "@/types/sanity";

// Anta en bränslebesparing. Detta värde bör helst komma från din Sanity-data per steg.
// Om du inte har det, kan du använda ett generellt värde här.
const FUEL_SAVING_PERCENTAGE = 0.15; // 15% besparing

export default function FuelSavingCalculator({ stage }: { stage: Stage }) {
  const [mileage, setMileage] = useState("10000"); // Årlig körsträcka i mil
  const [fuelPrice, setFuelPrice] = useState("17"); // Bränslepris per liter
  const [consumption, setConsumption] = useState("3.5"); // Nuvarande förbrukning L/mil

  const { savedKronor, savedLiters } = useMemo(() => {
    const numericMileage = parseFloat(mileage.replace(",", ".")) || 0;
    const numericFuelPrice = parseFloat(fuelPrice.replace(",", ".")) || 0;
    const numericConsumption = parseFloat(consumption.replace(",", ".")) || 0;

    if (
      numericMileage === 0 ||
      numericFuelPrice === 0 ||
      numericConsumption === 0
    ) {
      return { savedKronor: 0, savedLiters: 0 };
    }

    const totalLitersBefore = numericMileage * numericConsumption;
    const litersSaved = totalLitersBefore * FUEL_SAVING_PERCENTAGE;
    const moneySaved = litersSaved * numericFuelPrice;

    return {
      savedKronor: Math.round(moneySaved),
      savedLiters: Math.round(litersSaved),
    };
  }, [mileage, fuelPrice, consumption]);

  // Hämta aktuellt språk från localStorage eller en kontext om du har det
  const currentLanguage =
    typeof window !== "undefined" ? localStorage.getItem("lang") || "sv" : "sv";

  return (
    <div className="bg-gray-700/50 p-6 border-t border-b border-gray-600">
      <h3 className="text-xl font-semibold text-white mb-4 text-center">
        {t(currentLanguage, "fuelCalculatorTitle")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label
            htmlFor="mileage"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {t(currentLanguage, "mileageLabel")} (mil/år)
          </label>
          <input
            type="text"
            id="mileage"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label
            htmlFor="fuelPrice"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {t(currentLanguage, "fuelPriceLabel")} (kr/L)
          </label>
          <input
            type="text"
            id="fuelPrice"
            value={fuelPrice}
            onChange={(e) => setFuelPrice(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
        <div>
          <label
            htmlFor="consumption"
            className="block text-sm font-medium text-gray-300 mb-1"
          >
            {t(currentLanguage, "consumptionLabel")} (L/mil)
          </label>
          <input
            type="text"
            id="consumption"
            value={consumption}
            onChange={(e) => setConsumption(e.target.value)}
            className="w-full p-2 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>
      </div>
      <div className="text-center bg-gray-800 p-4 rounded-lg">
        <p className="text-lg text-gray-300">
          {t(currentLanguage, "estimatedSavingsLabel")}
        </p>
        <p className="text-3xl font-bold text-green-400 mt-1">
          {savedKronor.toLocaleString("sv-SE")} kr /{" "}
          {t(currentLanguage, "yearLabel")}
        </p>
        <p className="text-md text-gray-400 mt-1">
          (~{savedLiters.toLocaleString("sv-SE")}{" "}
          {t(currentLanguage, "litersLabel")})
        </p>
      </div>
    </div>
  );
}

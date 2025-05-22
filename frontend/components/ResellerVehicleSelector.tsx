// components/ResellerVehicleSelector.tsx
"use client";

import { useEffect, useState } from "react";
import VehicleSelector from "@/components/VehicleSelector";
import type { Brand } from "@/types/sanity";

export default function ResellerVehicleSelector({
  selectedBrand,
  selectedModel,
  selectedYear,
  selectedEngine,
  onBrandChange,
  onModelChange,
  onYearChange,
  onEngineChange,
  resellerId,
}: {
  selectedBrand: string;
  selectedModel: string;
  selectedYear: string;
  selectedEngine: string;
  onBrandChange: (val: string) => void;
  onModelChange: (val: string) => void;
  onYearChange: (val: string) => void;
  onEngineChange: (val: string) => void;
  resellerId: string;
}) {
  const [brands, setBrands] = useState<Brand[]>([]);

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const res = await fetch("/api/brands");
        const { result } = await res.json();
        setBrands(result || []);
      } catch (err) {
        console.error("Failed to fetch brands:", err);
      }
    };
    fetchBrands();
  }, []);

  return (
    <VehicleSelector
      brands={brands}
      selectedBrand={selectedBrand}
      selectedModel={selectedModel}
      selectedYear={selectedYear}
      selectedEngine={selectedEngine}
      onBrandChange={onBrandChange}
      onModelChange={onModelChange}
      onYearChange={onYearChange}
      onEngineChange={onEngineChange}
      resellerId={resellerId}
    />
  );
}

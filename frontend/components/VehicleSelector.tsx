// components/VehicleSelector.tsx
import { useRouter } from "next/router";
import React from "react";

interface Props {
  brands: any[];
  selectedBrand: string;
  selectedModel: string;
  selectedYear: string;
  selectedEngine: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  onYearChange: (year: string) => void;
  onEngineChange: (engine: string) => void;
  resellerId?: string;
}

const VehicleSelector = ({
  brands,
  selectedBrand,
  selectedModel,
  selectedYear,
  selectedEngine,
  onBrandChange,
  onModelChange,
  onYearChange,
  onEngineChange,
  resellerId,
}: Props) => {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* BRAND */}
      <select
        className="dropdown"
        value={selectedBrand}
        onChange={(e) => onBrandChange(e.target.value)}
      >
        <option value="">Välj märke</option>
        {brands.map((b) => (
          <option key={b.slugCurrent} value={b.slugCurrent}>
            {b.name}
          </option>
        ))}
      </select>

      {/* MODEL */}
      <select
        className="dropdown"
        value={selectedModel}
        onChange={(e) => onModelChange(e.target.value)}
        disabled={!selectedBrand}
      >
        <option value="">Välj modell</option>
        {brands
          .find((b) => b.slugCurrent === selectedBrand)
          ?.models?.map((m) => (
            <option key={m.slug?.current || m.name} value={m.slug?.current || m.name}>
              {m.name}
            </option>
          ))}
      </select>

      {/* YEAR */}
      <select
        className="dropdown"
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        disabled={!selectedModel}
      >
        <option value="">Välj årsmodell</option>
        {brands
          .find((b) => b.slugCurrent === selectedBrand)
          ?.models?.find((m) => (m.slug?.current || m.name) === selectedModel)
          ?.years?.map((y) => (
            <option key={y.range} value={y.range}>
              {y.range}
            </option>
          ))}
      </select>

      {/* ENGINE */}
      <select
        className="dropdown"
        value={selectedEngine}
        onChange={(e) => {
          onEngineChange(e.target.value);
          const engineSlug = e.target.value;
          if (resellerId) {
            router.push(
              `/reseller/${resellerId}/${selectedBrand}/${selectedModel}/${selectedYear}/${engineSlug}`
            );
          } else {
            router.push(
              `/${selectedBrand}/${selectedModel}/${selectedYear}/${engineSlug}`
            );
          }
        }}
        disabled={!selectedYear}
      >
        <option value="">Välj motor</option>
        {brands
          .find((b) => b.slugCurrent === selectedBrand)
          ?.models?.find((m) => (m.slug?.current || m.name) === selectedModel)
          ?.years?.find((y) => y.range === selectedYear)
          ?.engines?.map((e) => (
            <option key={e.label} value={e.label}>
              {e.label}
            </option>
          ))}
      </select>
    </div>
  );
};

export default VehicleSelector;

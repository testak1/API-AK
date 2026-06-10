interface MissingItem {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  fuel?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
  stages?: ImportStage[];
  sanityMatch?: SanityMatch;
}

interface ImportStage {
  name?: string;
  type?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface ImportTableProps {
  missing: MissingItem[];
  selected: string[];
  onToggle: (engineId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectOnlyNew: () => void;
  isAlreadyImported: (item: MissingItem) => boolean;
  canImportItem: (item: MissingItem) => boolean;
}

interface SanityMatch {
  status:
    | "exists"
    | "missing_stages"
    | "new_engine"
    | "new_year"
    | "new_model"
    | "missing_brand";
  matchedYear?: string;
  existingStages: string[];
  missingStages: string[];
  message: string;
}

export default function ImportTable({
  missing,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSelectOnlyNew,
  isAlreadyImported,
  canImportItem,
}: ImportTableProps) {
  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const importableItems = missing.filter(canImportItem);
  const selectedImportableCount = selected.filter(id => {
    const item = missing.find(m => getEngineId(m) === id);
    return item && canImportItem(item);
  }).length;
  const allSelected =
    importableItems.length > 0 &&
    selectedImportableCount === importableItems.length;
  const someSelected =
    selectedImportableCount > 0 &&
    selectedImportableCount < importableItems.length;

  const newItemsCount = importableItems.length;
  const selectedNewCount = selected.filter(id => {
    const item = missing.find(m => getEngineId(m) === id);
    return item && canImportItem(item);
  }).length;

  const getStages = (item: MissingItem): ImportStage[] => {
    if (Array.isArray(item.stages) && item.stages.length > 0) {
      return item.stages;
    }

    if (item.origHk || item.tunedHk || item.origNm || item.tunedNm) {
      return [
        {
          name: "Steg 1",
          origHk: item.origHk,
          tunedHk: item.tunedHk,
          origNm: item.origNm,
          tunedNm: item.tunedNm,
        },
      ];
    }

    return [];
  };

  const getStatusBadge = (item: MissingItem) => {
    const match = item.sanityMatch;

    if (!match) {
      return {
        label: isAlreadyImported(item) ? "Finns" : "Ej kollad",
        className: isAlreadyImported(item)
          ? "bg-green-100 text-green-700 border-green-200"
          : "bg-gray-100 text-gray-700 border-gray-200",
        title: isAlreadyImported(item)
          ? "Finns i lokal importhistorik"
          : "Inte kontrollerad mot Sanity",
      };
    }

    if (match.status === "exists") {
      return {
        label: "Finns",
        className: "bg-green-100 text-green-700 border-green-200",
        title: match.message,
      };
    }

    if (match.status === "missing_stages") {
      return {
        label: "Saknar steg",
        className: "bg-amber-100 text-amber-800 border-amber-200",
        title: match.message,
      };
    }

    if (match.status === "missing_brand") {
      return {
        label: "Saknar märke",
        className: "bg-red-100 text-red-700 border-red-200",
        title: match.message,
      };
    }

    const labels: Record<string, string> = {
      new_engine: "Ny motor",
      new_year: "Ny årsmodell",
      new_model: "Ny modell",
    };

    return {
      label: labels[match.status] || "Ny",
      className: "bg-blue-100 text-blue-700 border-blue-200",
      title: match.message,
    };
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Motorer att importera ({missing.length})
          {newItemsCount > 0 && (
            <span className="text-green-600 ml-2">({newItemsCount} nya)</span>
          )}
        </h3>
        <div className="space-x-2">
          <button
            onClick={onSelectOnlyNew}
            className="px-3 py-1 text-sm bg-cyan-500 text-white rounded hover:bg-cyan-600"
          >
            Markera nya ({newItemsCount})
          </button>
          <button
            onClick={onSelectAll}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Markera alla
          </button>
          <button
            onClick={onDeselectAll}
            className="px-3 py-1 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Avmarkera alla
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-300 text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 border">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={input => {
                    if (input) {
                      input.indeterminate = someSelected;
                    }
                  }}
                  onChange={() =>
                    allSelected ? onDeselectAll() : onSelectAll()
                  }
                />
              </th>
              <th className="p-2 border text-left">Status</th>
              <th className="p-2 border text-left">Märke</th>
              <th className="p-2 border text-left">Modell</th>
              <th className="p-2 border text-left">År</th>
              <th className="p-2 border text-left">Motor</th>
              <th className="p-2 border text-left">Steg</th>
              <th className="p-2 border text-left">Bränsle</th>
              <th className="p-2 border text-left">HK</th>
              <th className="p-2 border text-left">NM</th>
            </tr>
          </thead>
          <tbody>
            {missing.map(item => {
              const engineId = getEngineId(item);
              const isSelected = selected.includes(engineId);
              const isImported = isAlreadyImported(item);
              const isImportable = canImportItem(item);
              const stages = getStages(item);
              const statusBadge = getStatusBadge(item);
              const primaryStage = stages.find(stage =>
                ["steg1", "stage1"].includes(
                  (stage.name || "").toLowerCase().replace(/[^a-z0-9]/g, "")
                )
              ) || stages[0];

              return (
                <tr
                  key={engineId}
                  className={`border-b hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50" : ""
                  } ${
                    item.sanityMatch?.status === "exists"
                      ? "bg-green-50"
                      : item.sanityMatch?.status === "missing_stages"
                        ? "bg-amber-50"
                        : ""
                  } ${!isImportable ? "opacity-60" : ""}`}
                >
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(engineId)}
                      disabled={!isImportable}
                    />
                  </td>
                  <td className="p-2 border">
                    <span
                      className={`inline-block rounded border px-2 py-1 text-xs font-medium ${statusBadge.className}`}
                      title={statusBadge.title}
                    >
                      {statusBadge.label}
                    </span>
                    {item.sanityMatch?.missingStages?.length ? (
                      <div className="mt-1 text-xs text-amber-700">
                        {item.sanityMatch.missingStages.join(", ")}
                      </div>
                    ) : null}
                    {!item.sanityMatch && isImported ? (
                      <span
                        className="ml-2 text-green-600 font-medium"
                        title="Redan importerad"
                      >
                        ✓
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 border font-medium">{item.brand}</td>
                  <td className="p-2 border">{item.model || "-"}</td>
                  <td className="p-2 border">{item.year || "-"}</td>
                  <td className="p-2 border font-medium">
                    {item.engine || "-"}
                  </td>
                  <td className="p-2 border">
                    {stages.length
                      ? stages.map(stage => stage.name || "Steg").join(", ")
                      : "-"}
                  </td>
                  <td className="p-2 border">{item.fuel || "Bensin"}</td>
                  <td className="p-2 border">
                    {primaryStage?.origHk && primaryStage?.tunedHk
                      ? `${primaryStage.origHk}→${primaryStage.tunedHk}`
                      : "-"}
                  </td>
                  <td className="p-2 border">
                    {primaryStage?.origNm && primaryStage?.tunedNm
                      ? `${primaryStage.origNm}→${primaryStage.tunedNm}`
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {missing.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Inga motorer att visa med aktuella filter
        </div>
      )}

      {/* Selected summary */}
      {selected.length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <strong>{selected.length} motorer valda</strong>
          {selectedNewCount > 0 && (
            <span className="text-green-600 ml-2">
              ({selectedNewCount} nya att importera)
            </span>
          )}
          {selected.length > selectedNewCount && (
            <span className="text-gray-600 ml-2">
              ({selected.length - selectedNewCount} redan importerade)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

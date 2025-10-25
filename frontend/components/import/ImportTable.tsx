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
}

interface ImportTableProps {
  missing: MissingItem[];
  selected: string[];
  onToggle: (engineId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectOnlyNew: () => void;
  isAlreadyImported: (item: MissingItem) => boolean;
}

export default function ImportTable({
  missing,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
  onSelectOnlyNew,
  isAlreadyImported,
}: ImportTableProps) {
  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const allSelected = missing.length > 0 && selected.length === missing.length;
  const someSelected = selected.length > 0 && selected.length < missing.length;

  const newItemsCount = missing.filter(item => !isAlreadyImported(item)).length;
  const selectedNewCount = selected.filter(id => {
    const item = missing.find(m => getEngineId(m) === id);
    return item && !isAlreadyImported(item);
  }).length;

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
              <th className="p-2 border text-left">Bränsle</th>
              <th className="p-2 border text-left">HK</th>
              <th className="p-2 border text-left">NM</th>
            </tr>
          </thead>
          <tbody>
            {missing.map((item, index) => {
              const engineId = getEngineId(item);
              const isSelected = selected.includes(engineId);
              const isImported = isAlreadyImported(item);

              return (
                <tr
                  key={engineId}
                  className={`border-b hover:bg-gray-50 ${
                    isSelected ? "bg-blue-50" : ""
                  } ${isImported ? "opacity-60" : ""}`}
                >
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(engineId)}
                      disabled={isImported}
                    />
                  </td>
                  <td className="p-2 border">
                    {isImported ? (
                      <span
                        className="text-green-600 font-medium"
                        title="Redan importerad"
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="text-blue-600 font-medium" title="Ny">
                        Ny
                      </span>
                    )}
                  </td>
                  <td className="p-2 border font-medium">{item.brand}</td>
                  <td className="p-2 border">{item.model || "-"}</td>
                  <td className="p-2 border">{item.year || "-"}</td>
                  <td className="p-2 border font-medium">
                    {item.engine || "-"}
                  </td>
                  <td className="p-2 border">{item.fuel || "Bensin"}</td>
                  <td className="p-2 border">
                    {item.origHk && item.tunedHk
                      ? `${item.origHk}→${item.tunedHk}`
                      : "-"}
                  </td>
                  <td className="p-2 border">
                    {item.origNm && item.tunedNm
                      ? `${item.origNm}→${item.tunedNm}`
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

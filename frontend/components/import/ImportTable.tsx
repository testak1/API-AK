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
}

export default function ImportTable({
  missing,
  selected,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: ImportTableProps) {
  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`.replace(
      /\s+/g,
      "_"
    );

  const allSelected = missing.length > 0 && selected.length === missing.length;
  const someSelected = selected.length > 0 && selected.length < missing.length;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">
          Saknade motorer ({missing.length})
        </h3>
        <div className="space-x-2">
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

              return (
                <tr
                  key={engineId}
                  className={`border-b hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
                >
                  <td className="p-2 border">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggle(engineId)}
                    />
                  </td>
                  <td className="p-2 border">{item.brand}</td>
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
          Inga saknade motorer att importera
        </div>
      )}
    </div>
  );
}

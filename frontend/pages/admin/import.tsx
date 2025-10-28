// components/import/BikeImport.tsx
import {useState, useEffect} from "react";

interface MissingBike {
  brand: string;
  model: string;
  year: string;
  engine: string;
  type: string;
  vehicleType?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

interface ImportResult {
  brand: string;
  model: string;
  year: string;
  engine: string;
  status: "created" | "exists" | "error";
  message?: string;
}

const IMPORT_HISTORY_KEY = "bike-import-history";

export default function BikeImport() {
  const [missing, setMissing] = useState<MissingBike[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importHistory, setImportHistory] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    showOnlyNew: true,
  });

  // Ladda import-historik
  useEffect(() => {
    const savedHistory = localStorage.getItem(IMPORT_HISTORY_KEY);
    if (savedHistory) {
      try {
        const historyArray = JSON.parse(savedHistory);
        setImportHistory(new Set(historyArray));
      } catch (error) {
        console.error("Kunde inte ladda import-historik:", error);
      }
    }
  }, []);

  // Spara import-historik
  useEffect(() => {
    if (importHistory.size > 0) {
      localStorage.setItem(
        IMPORT_HISTORY_KEY,
        JSON.stringify(Array.from(importHistory))
      );
    }
  }, [importHistory]);

  const getBikeId = (item: MissingBike | ImportResult) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const isAlreadyImported = (item: MissingBike) =>
    importHistory.has(getBikeId(item));

  const addToImportHistory = (items: MissingBike[]) => {
    const newHistory = new Set(importHistory);
    items.forEach(item => {
      const bikeId = getBikeId(item);
      newHistory.add(bikeId);
    });
    setImportHistory(newHistory);
  };

  // Filtrera bort redan importerade och applicera sökfilter
  const filteredMissing = missing.filter(item => {
    // Filtrera bort redan importerade om "Visa bara nya" är aktiverat
    if (filters.showOnlyNew && isAlreadyImported(item)) {
      return false;
    }

    // Applicera brand filter
    if (
      filters.brand &&
      !item.brand.toLowerCase().includes(filters.brand.toLowerCase())
    ) {
      return false;
    }

    // Applicera model filter
    if (
      filters.model &&
      !item.model.toLowerCase().includes(filters.model.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // NY: Välj specifikt antal nya objekt
  const selectSpecificCount = (count: number) => {
    const newItems = filteredMissing.filter(item => !isAlreadyImported(item));
    const itemsToSelect = newItems.slice(0, count);
    const newSelected = new Set(selected);

    itemsToSelect.forEach(item => {
      newSelected.add(getBikeId(item));
    });

    setSelected(Array.from(newSelected));
    setStatus(`Valde ${itemsToSelect.length} nya Bikes/Quads`);
  };

  // NY: Välj specifikt antal från alla filtrerade
  const selectSpecificCountFromAll = (count: number) => {
    const itemsToSelect = filteredMissing.slice(0, count);
    const newSelected = new Set(selected);

    itemsToSelect.forEach(item => {
      newSelected.add(getBikeId(item));
    });

    setSelected(Array.from(newSelected));
    setStatus(
      `Valde ${itemsToSelect.length} Bikes/Quads från filtrerade listan`
    );
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Konvertera Bike/Quad JSON till vårt format
      const bikes: MissingBike[] = [];

      for (const [brandName, brandData] of Object.entries(json)) {
        for (const [modelName, modelData] of Object.entries(
          (brandData as any).models || {}
        )) {
          for (const [yearName, yearData] of Object.entries(
            (modelData as any).years || {}
          )) {
            for (const [engineName, engineData] of Object.entries(
              (yearData as any).engines || {}
            )) {
              const engine = engineData as any;
              const stage1 =
                engine.stages?.["Stage 1"] ||
                Object.values(engine.stages || {})[0];

              // Bestäm vehicleType baserat på model/brand
              const vehicleType = determineVehicleType(brandName, modelName);

              bikes.push({
                brand: brandName,
                model: modelName,
                year: yearName,
                engine: engineName,
                type: engine.type,
                vehicleType,
                origHk: stage1?.origHk,
                tunedHk: stage1?.tunedHk,
                origNm: stage1?.origNm,
                tunedNm: stage1?.tunedNm,
                price: stage1?.price,
              });
            }
          }
        }
      }

      setMissing(bikes);
      setSelected([]);
      setImportResults([]);

      const alreadyImportedCount = bikes.filter(item =>
        isAlreadyImported(item)
      ).length;
      const newItemsCount = bikes.length - alreadyImportedCount;

      setStatus(
        `Laddade ${bikes.length} Bikes/Quads (${newItemsCount} nya, ${alreadyImportedCount} redan importerade)`
      );
    } catch (err) {
      console.error("Fel vid uppladdning:", err);
      alert("Kunde inte läsa Bike/Quad filen.");
    }
  };

  const determineVehicleType = (brand: string, model: string): string => {
    const lowerBrand = brand.toLowerCase();
    const lowerModel = model.toLowerCase();

    if (
      lowerModel.includes("atv") ||
      lowerModel.includes("quad") ||
      lowerBrand.includes("atv")
    ) {
      return "atv";
    }
    if (lowerModel.includes("scooter") || lowerBrand.includes("scooter")) {
      return "scooter";
    }
    return "motorcycle";
  };

  const toggleSelect = (bikeId: string) => {
    setSelected(prev =>
      prev.includes(bikeId)
        ? prev.filter(id => id !== bikeId)
        : [...prev, bikeId]
    );
  };

  const selectAll = () => {
    setSelected(filteredMissing.map(item => getBikeId(item)));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const selectOnlyNew = () => {
    const newItems = filteredMissing.filter(item => !isAlreadyImported(item));
    setSelected(newItems.map(item => getBikeId(item)));
  };

  const handleImport = async () => {
    if (!selected.length) return alert("Välj minst en Bike/Quad.");

    // Varning om många objekt
    if (selected.length > 500) {
      const confirmed = confirm(
        `Du håller på att importera ${selected.length} Bikes/Quads. Detta kan ta flera minuter. Vill du fortsätta?`
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setImportResults([]);

    try {
      const selectedItems = missing.filter(item =>
        selected.includes(getBikeId(item))
      );

      const res = await fetch("/api/import/bikes", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({items: selectedItems}),
      });

      const data = await res.json();

      if (data.results) {
        setImportResults(data.results);

        // Lägg till framgångsrika imports i historiken
        const successfulImports = selectedItems.filter(
          (item, index) => data.results[index]?.status === "created"
        );
        addToImportHistory(successfulImports);
      }

      setStatus(
        data.message ||
          `Import klar. ${data.summary?.created} nya Bikes/Quads skapade.`
      );

      // Uppdatera missing-listan
      if (data.results) {
        const successfullyImportedIds = data.results
          .filter((r: ImportResult) => r.status === "created")
          .map((r: ImportResult) => getBikeId(r));

        setMissing(prev =>
          prev.filter(
            item => !successfullyImportedIds.includes(getBikeId(item))
          )
        );
        setSelected(prev =>
          prev.filter(id => !successfullyImportedIds.includes(id))
        );
      }
    } catch (err) {
      console.error(err);
      alert("Import misslyckades.");
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = () => {
    if (
      confirm("Är du säker på att du vill radera Bike/Quad import-historiken?")
    ) {
      setImportHistory(new Set());
      localStorage.removeItem(IMPORT_HISTORY_KEY);
      setStatus("Bike/Quad import-historik raderad");
    }
  };

  const stats = {
    total: missing.length,
    new: missing.filter(item => !isAlreadyImported(item)).length,
    imported: missing.filter(item => isAlreadyImported(item)).length,
    filtered: filteredMissing.length,
    selectedNew: selected.filter(id => {
      const item = missing.find(m => getBikeId(m) === id);
      return item && !isAlreadyImported(item);
    }).length,
  };

  return (
    <div
      style={{
        padding: 30,
        fontFamily: "sans-serif",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <h1>🏍️ Bikes & Quads Import</h1>
      <p>
        Välj <strong>br_performance_bikes_complete.json</strong> för att
        importera Bikes & Quads.
      </p>

      <div style={{marginBottom: 20}}>
        <input type="file" accept=".json" onChange={handleFileUpload} />
      </div>

      {missing.length > 0 && (
        <div
          style={{
            background: "#f8f9fa",
            padding: 15,
            borderRadius: 8,
            marginBottom: 20,
            border: "1px solid #e9ecef",
          }}
        >
          <div style={{display: "flex", gap: 20, flexWrap: "wrap"}}>
            <div>
              <strong>Totalt:</strong> {stats.total}
            </div>
            <div style={{color: "#28a745"}}>
              <strong>Nya:</strong> {stats.new}
            </div>
            <div style={{color: "#6c757d"}}>
              <strong>Importerade:</strong> {stats.imported}
            </div>
            <div>
              <strong>Filtrerade:</strong> {stats.filtered}
            </div>
            <div style={{color: "#007bff"}}>
              <strong>Valda (nya):</strong> {selected.length} (
              {stats.selectedNew})
            </div>
          </div>
        </div>
      )}

      <p>{status}</p>

      {/* Filter och kontroller */}
      {missing.length > 0 && (
        <div style={{marginBottom: 20}}>
          <div
            style={{
              display: "flex",
              gap: 15,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div>
              <label>
                <input
                  type="checkbox"
                  checked={filters.showOnlyNew}
                  onChange={e =>
                    setFilters(prev => ({
                      ...prev,
                      showOnlyNew: e.target.checked,
                    }))
                  }
                  style={{marginRight: 8}}
                />
                Visa bara nya
              </label>
            </div>

            <div>
              <input
                type="text"
                placeholder="Filtrera märke..."
                value={filters.brand}
                onChange={e =>
                  setFilters(prev => ({...prev, brand: e.target.value}))
                }
                style={{
                  padding: "5px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
              />
            </div>

            <div>
              <input
                type="text"
                placeholder="Filtrera modell..."
                value={filters.model}
                onChange={e =>
                  setFilters(prev => ({...prev, model: e.target.value}))
                }
                style={{
                  padding: "5px 10px",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
              />
            </div>

            {/* NY: Knappar för att välja specifika antal */}
            <div style={{display: "flex", gap: 5, flexWrap: "wrap"}}>
              <button
                onClick={() => selectSpecificCount(100)}
                disabled={stats.new < 100}
                style={{
                  padding: "5px 10px",
                  background: stats.new >= 100 ? "#17a2b8" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: stats.new >= 100 ? "pointer" : "not-allowed",
                }}
                title="Välj 100 nya Bikes/Quads"
              >
                100 nya
              </button>
              <button
                onClick={() => selectSpecificCount(200)}
                disabled={stats.new < 200}
                style={{
                  padding: "5px 10px",
                  background: stats.new >= 200 ? "#17a2b8" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: stats.new >= 200 ? "pointer" : "not-allowed",
                }}
                title="Välj 200 nya Bikes/Quads"
              >
                200 nya
              </button>
              <button
                onClick={() => selectSpecificCount(500)}
                disabled={stats.new < 500}
                style={{
                  padding: "5px 10px",
                  background: stats.new >= 500 ? "#17a2b8" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: stats.new >= 500 ? "pointer" : "not-allowed",
                }}
                title="Välj 500 nya Bikes/Quads"
              >
                500 nya
              </button>
              <button
                onClick={() => selectSpecificCountFromAll(100)}
                disabled={stats.filtered < 100}
                style={{
                  padding: "5px 10px",
                  background: stats.filtered >= 100 ? "#6f42c1" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: stats.filtered >= 100 ? "pointer" : "not-allowed",
                }}
                title="Välj 100 från filtrerade Bikes/Quads"
              >
                100 filtrerade
              </button>
            </div>

            <button
              onClick={clearHistory}
              style={{
                padding: "5px 10px",
                background: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Rensa historik
            </button>
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <>
          <div style={{marginBottom: 20}}>
            <div style={{display: "flex", gap: 10, flexWrap: "wrap"}}>
              <button
                onClick={selectOnlyNew}
                style={{
                  padding: "8px 15px",
                  background: "#17a2b8",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Markera alla nya ({stats.new})
              </button>
              <button
                onClick={selectAll}
                style={{
                  padding: "8px 15px",
                  background: "#007bff",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Markera alla
              </button>
              <button
                onClick={deselectAll}
                style={{
                  padding: "8px 15px",
                  background: "#6c757d",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Avmarkera alla
              </button>
            </div>
          </div>

          <div style={{overflowX: "auto"}}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{background: "#eee"}}>
                  <th style={{padding: 8, border: "1px solid #ccc"}}>
                    <input
                      type="checkbox"
                      checked={selected.length === filteredMissing.length}
                      onChange={() =>
                        selected.length === filteredMissing.length
                          ? deselectAll()
                          : selectAll()
                      }
                    />
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Model
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Year
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Engine
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Vehicle
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    HK
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Price
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredMissing.map((item, index) => {
                  const bikeId = getBikeId(item);
                  const isSelected = selected.includes(bikeId);
                  const isImported = isAlreadyImported(item);

                  return (
                    <tr
                      key={bikeId}
                      style={{
                        background: isSelected ? "#e3f2fd" : "transparent",
                        opacity: isImported ? 0.6 : 1,
                      }}
                    >
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(bikeId)}
                          disabled={isImported}
                        />
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {isImported ? (
                          <span
                            style={{color: "green"}}
                            title="Redan importerad"
                          >
                            ✓
                          </span>
                        ) : (
                          <span style={{color: "blue"}} title="Ny">
                            Ny
                          </span>
                        )}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.brand}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.model}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.year}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.engine}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.type}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.vehicleType}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.origHk && item.tunedHk
                          ? `${item.origHk}→${item.tunedHk}`
                          : "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        {item.price ? `${item.price} EUR` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleImport}
            disabled={loading || selected.length === 0}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: loading ? "#6c757d" : "#28a745",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: selected.length > 0 ? "pointer" : "not-allowed",
              opacity: selected.length > 0 ? 1 : 0.6,
            }}
          >
            {loading
              ? "Importerar..."
              : `Importera valda Bikes/Quads (${selected.length})`}
          </button>
        </>
      )}

      {importResults.length > 0 && (
        <div style={{marginTop: 30}}>
          <h3>Importresultat</h3>
          <div style={{overflowX: "auto"}}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "14px",
              }}
            >
              <thead>
                <tr style={{background: "#eee"}}>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Brand
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Model
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Year
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Engine
                  </th>
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {importResults.map((result, i) => (
                  <tr key={i}>
                    <td style={{padding: 8, border: "1px solid #ccc"}}>
                      {result.brand}
                    </td>
                    <td style={{padding: 8, border: "1px solid #ccc"}}>
                      {result.model}
                    </td>
                    <td style={{padding: 8, border: "1px solid #ccc"}}>
                      {result.year}
                    </td>
                    <td style={{padding: 8, border: "1px solid #ccc"}}>
                      {result.engine}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        border: "1px solid #ccc",
                        color:
                          result.status === "created"
                            ? "green"
                            : result.status === "exists"
                              ? "orange"
                              : "red",
                        fontWeight: "bold",
                      }}
                    >
                      {result.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

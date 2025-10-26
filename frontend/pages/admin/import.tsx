import {useState, useEffect} from "react";
import ImportTable from "../../components/import/ImportTable";
import JetSkiImport from "../../components/import/JetSkiImport";

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

interface ImportResult {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  status: "created" | "exists" | "error";
  action?: string;
  message?: string;
}

// Nyckel för localStorage
const IMPORT_HISTORY_KEY = "sanity-import-history";

type ImportTab = "cars" | "jetskis" | "bikes";

function CarImport() {
  const [missing, setMissing] = useState<MissingItem[]>([]);
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

  // Ladda import-historik vid start
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

  // Spara import-historik när den ändras
  useEffect(() => {
    if (importHistory.size > 0) {
      localStorage.setItem(
        IMPORT_HISTORY_KEY,
        JSON.stringify(Array.from(importHistory))
      );
    }
  }, [importHistory]);

  // Lägg till importerade motorer i historiken
  const addToImportHistory = (items: MissingItem[]) => {
    const newHistory = new Set(importHistory);
    items.forEach(item => {
      const engineId = getEngineId(item);
      newHistory.add(engineId);
    });
    setImportHistory(newHistory);
  };

  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const isAlreadyImported = (item: MissingItem) =>
    importHistory.has(getEngineId(item));

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
      !item.model?.toLowerCase().includes(filters.model.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      if (!Array.isArray(json)) {
        alert("Ogiltig JSON-fil. Välj missing_import.json.");
        return;
      }

      setMissing(json);
      setSelected([]);
      setImportResults([]);

      const alreadyImportedCount = json.filter(item =>
        isAlreadyImported(item)
      ).length;
      const newItemsCount = json.length - alreadyImportedCount;

      setStatus(
        `Laddade ${json.length} objekt (${newItemsCount} nya, ${alreadyImportedCount} redan importerade)`
      );
    } catch (err) {
      console.error("Fel vid uppladdning:", err);
      alert("Kunde inte läsa filen.");
    }
  };

  const toggleSelect = (engineId: string) => {
    setSelected(prev =>
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    );
  };

  const selectAll = () => {
    setSelected(filteredMissing.map(item => getEngineId(item)));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const selectOnlyNew = () => {
    const newItems = filteredMissing.filter(item => !isAlreadyImported(item));
    setSelected(newItems.map(item => getEngineId(item)));
  };

  const handleImport = async () => {
    if (!selected.length) return alert("Välj minst ett objekt.");
    setLoading(true);
    setImportResults([]);

    try {
      // Hämta de valda objekten
      const selectedItems = missing.filter(item =>
        selected.includes(getEngineId(item))
      );

      const res = await fetch("/api/import/importMissing", {
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
        data.message || `Import klar. ${data.summary?.created} nya skapade.`
      );

      // Uppdatera missing-listan baserat på resultat
      if (data.results) {
        const successfullyImported = data.results
          .filter((r: ImportResult) => r.status === "created")
          .map((r: ImportResult) => getEngineId(r as MissingItem));

        setMissing(prev =>
          prev.filter(item => !successfullyImported.includes(getEngineId(item)))
        );
        setSelected(prev =>
          prev.filter(id => !successfullyImported.includes(id))
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
    if (confirm("Är du säker på att du vill radera import-historiken?")) {
      setImportHistory(new Set());
      localStorage.removeItem(IMPORT_HISTORY_KEY);
      setStatus("Import-historik raderad");
    }
  };

  const stats = {
    total: missing.length,
    new: missing.filter(item => !isAlreadyImported(item)).length,
    imported: missing.filter(item => isAlreadyImported(item)).length,
    filtered: filteredMissing.length,
    selectedNew: selected.filter(id => {
      const item = missing.find(m => getEngineId(m) === id);
      return item && !isAlreadyImported(item);
    }).length,
  };

  return (
    <div>
      <p>
        Välj <strong>missing_import.json</strong> för att granska och importera
        saknade bilar.
      </p>

      {/* Filuppladdning */}
      <div style={{marginBottom: 20}}>
        <input type="file" accept=".json" onChange={handleFileUpload} />
      </div>

      {/* Statistik */}
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
          <ImportTable
            missing={filteredMissing}
            selected={selected}
            onToggle={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onSelectOnlyNew={selectOnlyNew}
            isAlreadyImported={isAlreadyImported}
          />

          <div
            style={{marginTop: 20, display: "flex", gap: 10, flexWrap: "wrap"}}
          >
            <button
              onClick={selectOnlyNew}
              style={{
                padding: "10px 15px",
                background: "#17a2b8",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Markera alla nya
            </button>

            <button
              onClick={handleImport}
              disabled={loading || selected.length === 0}
              style={{
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
                : `Importera valda (${selected.length})`}
            </button>
          </div>
        </>
      )}

      {/* Importresultat */}
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
                  <th
                    style={{
                      padding: 8,
                      border: "1px solid #ccc",
                      textAlign: "left",
                    }}
                  >
                    Action
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
                    <td style={{padding: 8, border: "1px solid #ccc"}}>
                      {result.action}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {missing.length === 0 && (
        <div
          style={{textAlign: "center", padding: "40px 20px", color: "#6c757d"}}
        >
          Ladda upp en JSON-fil för att börja importera bilar
        </div>
      )}
    </div>
  );
}

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<ImportTab>("cars");

  return (
    <div
      style={{
        padding: 30,
        fontFamily: "sans-serif",
        maxWidth: 1400,
        margin: "0 auto",
      }}
    >
      <h1>⚙️ Sanity Importverktyg</h1>

      {/* Tab Navigation */}
      <div style={{marginBottom: 20, borderBottom: "1px solid #ccc"}}>
        <div style={{display: "flex", gap: 10}}>
          <button
            onClick={() => setActiveTab("cars")}
            style={{
              padding: "10px 20px",
              background: activeTab === "cars" ? "#007bff" : "transparent",
              color: activeTab === "cars" ? "white" : "#007bff",
              border: "1px solid #007bff",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
            }}
          >
            🚗 Bilar
          </button>
          <button
            onClick={() => setActiveTab("jetskis")}
            style={{
              padding: "10px 20px",
              background: activeTab === "jetskis" ? "#007bff" : "transparent",
              color: activeTab === "jetskis" ? "white" : "#007bff",
              border: "1px solid #007bff",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
            }}
          >
            🛥️ Jet-Skis
          </button>
          <button
            onClick={() => setActiveTab("bikes")}
            style={{
              padding: "10px 20px",
              background: activeTab === "bikes" ? "#007bff" : "transparent",
              color: activeTab === "bikes" ? "white" : "#007bff",
              border: "1px solid #007bff",
              borderRadius: "4px 4px 0 0",
              cursor: "pointer",
              opacity: 0.6,
            }}
            disabled
          >
            🏍️ Bikes/Quads (Kommer snart)
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "cars" && <CarImport />}
        {activeTab === "jetskis" && <JetSkiImport />}
        {activeTab === "bikes" && (
          <div style={{padding: 40, textAlign: "center", color: "#666"}}>
            <h3>Bikes/Quads Import</h3>
            <p>Kommer snart...</p>
          </div>
        )}
      </div>
    </div>
  );
}

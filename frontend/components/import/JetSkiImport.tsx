import {useState, useEffect} from "react";

interface MissingJetSki {
  brand: string;
  model: string;
  year: string;
  engine: string;
  type: string;
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

const IMPORT_HISTORY_KEY = "jet-ski-import-history";

export default function JetSkiImport() {
  const [missing, setMissing] = useState<MissingJetSki[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importHistory, setImportHistory] = useState<Set<string>>(new Set());

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

  const getJetSkiId = (item: MissingJetSki | ImportResult) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const isAlreadyImported = (item: MissingJetSki) =>
    importHistory.has(getJetSkiId(item));

  const addToImportHistory = (items: MissingJetSki[]) => {
    const newHistory = new Set(importHistory);
    items.forEach(item => {
      const jetSkiId = getJetSkiId(item);
      newHistory.add(jetSkiId);
    });
    setImportHistory(newHistory);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);

      // Konvertera Jet-Ski JSON till vårt format
      const jetSkis: MissingJetSki[] = [];

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

              jetSkis.push({
                brand: brandName,
                model: modelName,
                year: yearName,
                engine: engineName,
                type: engine.type,
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

      setMissing(jetSkis);
      setSelected([]);
      setImportResults([]);

      const alreadyImportedCount = jetSkis.filter(item =>
        isAlreadyImported(item)
      ).length;
      const newItemsCount = jetSkis.length - alreadyImportedCount;

      setStatus(
        `Laddade ${jetSkis.length} Jet-Skis (${newItemsCount} nya, ${alreadyImportedCount} redan importerade)`
      );
    } catch (err) {
      console.error("Fel vid uppladdning:", err);
      alert("Kunde inte läsa Jet-Ski filen.");
    }
  };

  const toggleSelect = (jetSkiId: string) => {
    setSelected(prev =>
      prev.includes(jetSkiId)
        ? prev.filter(id => id !== jetSkiId)
        : [...prev, jetSkiId]
    );
  };

  const selectAll = () => {
    setSelected(missing.map(item => getJetSkiId(item)));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const selectOnlyNew = () => {
    const newItems = missing.filter(item => !isAlreadyImported(item));
    setSelected(newItems.map(item => getJetSkiId(item)));
  };

  const handleImport = async () => {
    if (!selected.length) return alert("Välj minst en Jet-Ski.");
    setLoading(true);
    setImportResults([]);

    try {
      const selectedItems = missing.filter(item =>
        selected.includes(getJetSkiId(item))
      );

      const res = await fetch("/api/import/jetSkis", {
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
          `Import klar. ${data.summary?.created} nya Jet-Skis skapade.`
      );

      // Uppdatera missing-listan - FIX: Använd selectedItems istället för att konvertera ImportResult
      if (data.results) {
        const successfullyImportedIds = data.results
          .filter((r: ImportResult) => r.status === "created")
          .map((r: ImportResult) => getJetSkiId(r));

        setMissing(prev =>
          prev.filter(
            item => !successfullyImportedIds.includes(getJetSkiId(item))
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

  const stats = {
    total: missing.length,
    new: missing.filter(item => !isAlreadyImported(item)).length,
    imported: missing.filter(item => isAlreadyImported(item)).length,
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
      <h1>🛥️ Jet-Ski Import</h1>
      <p>
        Välj <strong>br_performance_jet_skis_complete.json</strong> för att
        importera Jet-Skis.
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
            <div style={{color: "#007bff"}}>
              <strong>Valda:</strong> {selected.length}
            </div>
          </div>
        </div>
      )}

      <p>{status}</p>

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
                      checked={selected.length === missing.length}
                      onChange={() =>
                        selected.length === missing.length
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
                {missing.map((item, index) => {
                  const jetSkiId = getJetSkiId(item);
                  const isSelected = selected.includes(jetSkiId);
                  const isImported = isAlreadyImported(item);

                  return (
                    <tr
                      key={jetSkiId}
                      style={{
                        background: isSelected ? "#e3f2fd" : "transparent",
                        opacity: isImported ? 0.6 : 1,
                      }}
                    >
                      <td style={{padding: 8, border: "1px solid #ccc"}}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(jetSkiId)}
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
              : `Importera valda Jet-Skis (${selected.length})`}
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

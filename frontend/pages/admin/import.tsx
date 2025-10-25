import {useState} from "react";
import ImportTable from "../../components/import/ImportTable";

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

export default function ImportPage() {
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);

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
      setStatus(`Laddade ${json.length} saknade objekt`);
    } catch (err) {
      console.error("Fel vid uppladdning:", err);
      alert("Kunde inte läsa filen.");
    }
  };

  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`.replace(
      /\s+/g,
      "_"
    );

  const toggleSelect = (engineId: string) => {
    setSelected(prev =>
      prev.includes(engineId)
        ? prev.filter(id => id !== engineId)
        : [...prev, engineId]
    );
  };

  const selectAll = () => {
    setSelected(missing.map(item => getEngineId(item)));
  };

  const deselectAll = () => {
    setSelected([]);
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

  return (
    <div style={{padding: 30, fontFamily: "sans-serif"}}>
      <h1>⚙️ Sanity Importverktyg</h1>
      <p>
        Välj <strong>missing_import.json</strong> för att granska och importera
        saknade poster.
      </p>

      <input type="file" accept=".json" onChange={handleFileUpload} />
      <p>{status}</p>

      {missing.length > 0 && (
        <>
          <ImportTable
            missing={missing}
            selected={selected}
            onToggle={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />

          <button
            onClick={handleImport}
            disabled={loading || selected.length === 0}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              cursor: selected.length > 0 ? "pointer" : "not-allowed",
              opacity: selected.length > 0 ? 1 : 0.6,
            }}
          >
            {loading ? "Importerar..." : `Importera valda (${selected.length})`}
          </button>
        </>
      )}

      {importResults.length > 0 && (
        <div style={{marginTop: 30}}>
          <h3>Importresultat</h3>
          <table style={{width: "100%", borderCollapse: "collapse"}}>
            <thead>
              <tr style={{background: "#eee"}}>
                <th>Brand</th>
                <th>Model</th>
                <th>Year</th>
                <th>Engine</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {importResults.map((result, i) => (
                <tr key={i}>
                  <td>{result.brand}</td>
                  <td>{result.model}</td>
                  <td>{result.year}</td>
                  <td>{result.engine}</td>
                  <td
                    style={{
                      color:
                        result.status === "created"
                          ? "green"
                          : result.status === "exists"
                            ? "orange"
                            : "red",
                    }}
                  >
                    {result.status}
                  </td>
                  <td>{result.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

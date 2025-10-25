import { useState } from "react";

interface MissingItem {
  type: string;
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  origHk?: number;
  tunedHk?: number;
  origNm?: number;
  tunedNm?: number;
  price?: number;
}

export default function ImportPage() {
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [selected, setSelected] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  const handleFileUpload = async (e: any) => {
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
      setStatus(`Laddade ${json.length} saknade objekt`);
    } catch (err) {
      console.error("Fel vid uppladdning:", err);
      alert("Kunde inte läsa filen.");
    }
  };

  const toggleSelect = (item: MissingItem) => {
    setSelected((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const handleImport = async () => {
    if (!selected.length) return alert("Välj minst ett objekt.");
    setLoading(true);

    try {
      const res = await fetch("/api/import/importMissing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: selected }),
      });

      const data = await res.json();
      setStatus(data.message || "Import klar");
    } catch (err) {
      console.error(err);
      alert("Import misslyckades.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>⚙️ Sanity Importverktyg</h1>
      <p>Välj <strong>missing_import.json</strong> för att granska och importera saknade poster.</p>

      <input type="file" accept=".json" onChange={handleFileUpload} />
      <p>{status}</p>

      {missing.length > 0 && (
        <>
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20 }}>
            <thead>
              <tr style={{ background: "#eee" }}>
                <th></th>
                <th>Brand</th>
                <th>Model</th>
                <th>Year</th>
                <th>Engine</th>
              </tr>
            </thead>
            <tbody>
              {missing.map((m, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(m)}
                      onChange={() => toggleSelect(m)}
                    />
                  </td>
                  <td>{m.brand}</td>
                  <td>{m.model}</td>
                  <td>{m.year}</td>
                  <td>{m.engine}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleImport}
            disabled={loading}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              background: loading ? "#ccc" : "#28a745",
              color: "white",
              border: "none",
              cursor: "pointer",
            }}
          >
            {loading
              ? "Importerar..."
              : `Importera valda (${selected.length})`}
          </button>
        </>
      )}
    </div>
  );
}

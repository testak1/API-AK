import { useState } from "react";
import ImportTable from "@/components/import/ImportTable";

export default function ImportPage() {
  const [missing, setMissing] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const brData = JSON.parse(text);

    const res = await fetch("/api/import/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brData }),
    });
    const data = await res.json();
    setMissing(data.missing);
  };

  const handleImport = async () => {
    const toImport = missing.filter((m) => selected.includes(m.engine));
    const res = await fetch("/api/import/commit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imports: toImport }),
    });
    const data = await res.json();
    alert(`Importerade ${data.results.filter((r: any) => r.status === "ok").length} motorer!`);
  };

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Importera BR-Performance data</h1>
      <input type="file" accept=".json" onChange={handleFileUpload} className="mb-4" />
      {missing.length > 0 && (
        <>
          <ImportTable
            missing={missing}
            selected={selected}
            onToggle={(engine) =>
              setSelected((prev) =>
                prev.includes(engine) ? prev.filter((e) => e !== engine) : [...prev, engine]
              )
            }
          />
          <button
            onClick={handleImport}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Importera valda
          </button>
        </>
      )}
    </div>
  );
}

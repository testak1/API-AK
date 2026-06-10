import {useState, useEffect, Suspense, lazy} from "react";
import ImportTable from "../../components/import/ImportTable";

// Lazy load JetSkiImport för bättre prestanda
const JetSkiImport = lazy(() => import("../../components/import/JetSkiImport"));
const BikeImport = lazy(() => import("../../components/import/BikeImport"));

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

interface ImportResult {
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  status: "created" | "exists" | "error";
  action?: string;
  message?: string;
}

interface ImportHistoryEntry {
  id: string;
  importedAt: string;
  brand: string;
  model?: string;
  year?: string;
  engine?: string;
  stages: string[];
  status: ImportResult["status"];
  action?: string;
  message?: string;
}

interface SanityMatch {
  id: string;
  status:
    | "exists"
    | "missing_stages"
    | "new_engine"
    | "new_year"
    | "new_model"
    | "missing_brand";
  brandExists: boolean;
  modelExists: boolean;
  yearExists: boolean;
  engineExists: boolean;
  matchedYear?: string;
  existingStages: string[];
  missingStages: string[];
  message: string;
}

// Nyckel för localStorage
const IMPORT_HISTORY_KEY = "sanity-import-history";
const IMPORT_HISTORY_DETAILS_KEY = "sanity-import-history-details";

type ImportTab = "cars" | "jetskis" | "bikes";
type CarView = "import" | "history";
type StatusFilter =
  | "all"
  | "needs_import"
  | "exists"
  | "missing_stages"
  | "new_structure";
type GroupLevel = "brand" | "model" | "year";

interface SelectionGroup {
  key: string;
  label: string;
  items: MissingItem[];
  count: number;
  statuses: Record<string, number>;
}

// Loading komponent för lazy loading
function LoadingFallback() {
  return (
    <div
      style={{
        padding: 40,
        textAlign: "center",
        color: "#666",
      }}
    >
      <p>Laddar...</p>
    </div>
  );
}

function CarImport() {
  const [activeCarView, setActiveCarView] = useState<CarView>("import");
  const [missing, setMissing] = useState<MissingItem[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingSanity, setCheckingSanity] = useState(false);
  const [status, setStatus] = useState("");
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [importHistory, setImportHistory] = useState<Set<string>>(new Set());
  const [importHistoryEntries, setImportHistoryEntries] = useState<
    ImportHistoryEntry[]
  >([]);
  const [filters, setFilters] = useState({
    brand: "",
    model: "",
    showOnlyNew: true,
    status: "needs_import" as StatusFilter,
  });

  // Ladda import-historik vid start
  useEffect(() => {
    const savedHistory = localStorage.getItem(IMPORT_HISTORY_KEY);
    const savedHistoryDetails = localStorage.getItem(IMPORT_HISTORY_DETAILS_KEY);

    if (savedHistory) {
      try {
        const historyArray = JSON.parse(savedHistory);
        setImportHistory(new Set(historyArray));
      } catch (error) {
        console.error("Kunde inte ladda import-historik:", error);
      }
    }

    if (savedHistoryDetails) {
      try {
        setImportHistoryEntries(JSON.parse(savedHistoryDetails));
      } catch (error) {
        console.error("Kunde inte ladda importhistorik-detaljer:", error);
      }
    }
  }, []);

  // Spara import-historik när den ändras
  useEffect(() => {
    localStorage.setItem(
      IMPORT_HISTORY_KEY,
      JSON.stringify(Array.from(importHistory))
    );
  }, [importHistory]);

  useEffect(() => {
    localStorage.setItem(
      IMPORT_HISTORY_DETAILS_KEY,
      JSON.stringify(importHistoryEntries)
    );
  }, [importHistoryEntries]);

  const getStageNames = (item: MissingItem) => {
    if (Array.isArray(item.stages) && item.stages.length > 0) {
      return item.stages.map(stage => stage.name || "Steg");
    }

    return item.origHk || item.tunedHk || item.origNm || item.tunedNm
      ? ["Steg 1"]
      : [];
  };

  // Lägg till importerade motorer i historiken
  const addToImportHistory = (
    items: MissingItem[],
    results: ImportResult[]
  ) => {
    const newHistory = new Set(importHistory);
    const timestamp = new Date().toISOString();
    const newEntries = items.map((item, index) => {
      const result = results[index];
      const engineId = getEngineId(item);

      if (result?.status === "created" || result?.status === "exists") {
        newHistory.add(engineId);
      }

      return {
        id: `${timestamp}-${engineId}-${index}`,
        importedAt: timestamp,
        brand: item.brand,
        model: item.model,
        year: item.year,
        engine: item.engine,
        stages: getStageNames(item),
        status: result?.status || "error",
        action: result?.action,
        message: result?.message,
      };
    });

    setImportHistory(newHistory);
    setImportHistoryEntries(prev => [...newEntries, ...prev].slice(0, 1000));
  };

  const getEngineId = (item: MissingItem) =>
    `${item.brand}-${item.model}-${item.year}-${item.engine}`
      .replace(/\s+/g, "_")
      .toLowerCase();

  const isAlreadyImported = (item: MissingItem) =>
    item.sanityMatch?.status === "exists" || importHistory.has(getEngineId(item));

  const canImportItem = (item: MissingItem) =>
    !isAlreadyImported(item) && item.sanityMatch?.status !== "missing_brand";

  const checkSanityMatches = async (items: MissingItem[]) => {
    setCheckingSanity(true);
    setStatus(`Kontrollerar ${items.length} rader mot Sanity...`);

    try {
      const res = await fetch("/api/import/checkMissing", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({items}),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Sanity-kontroll misslyckades");
      }

      const matchMap = new Map<string, SanityMatch>(
        (data.results || []).map((match: SanityMatch) => [match.id, match])
      );
      const checkedItems = items.map(item => ({
        ...item,
        sanityMatch: matchMap.get(getEngineId(item)),
      }));

      setMissing(checkedItems);
      setStatus(
        `Laddade ${items.length} objekt. ${data.summary?.exists || 0} finns redan, ${data.summary?.missingStages || 0} saknar steg, ${data.summary?.newEngines || 0} nya motorer.`
      );
    } catch (error) {
      console.error("Sanity-kontroll misslyckades:", error);
      setMissing(items);
      setStatus("Filen laddades, men Sanity-kontrollen misslyckades.");
    } finally {
      setCheckingSanity(false);
    }
  };

  // Filtrera bort redan importerade och applicera sökfilter
  const filteredMissing = missing.filter(item => {
    // Filtrera bort redan importerade om "Visa bara nya" är aktiverat
    if (
      filters.showOnlyNew &&
      filters.status !== "exists" &&
      isAlreadyImported(item)
    ) {
      return false;
    }

    if (filters.status === "needs_import" && !canImportItem(item)) {
      return false;
    }

    if (filters.status === "exists" && item.sanityMatch?.status !== "exists") {
      return false;
    }

    if (
      filters.status === "missing_stages" &&
      item.sanityMatch?.status !== "missing_stages"
    ) {
      return false;
    }

    if (
      filters.status === "new_structure" &&
      !["new_engine", "new_year", "new_model", "missing_brand"].includes(
        item.sanityMatch?.status || ""
      )
    ) {
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

  const importableFiltered = filteredMissing.filter(canImportItem);

  const addSelection = (items: MissingItem[], label: string) => {
    const importableItems = items.filter(canImportItem);
    const newSelected = new Set(selected);

    importableItems.forEach(item => {
      newSelected.add(getEngineId(item));
    });

    setSelected(Array.from(newSelected));
    setStatus(`Valde ${importableItems.length} objekt (${label})`);
  };

  const selectBySanityStatus = (
    statuses: SanityMatch["status"][],
    label: string
  ) => {
    addSelection(
      filteredMissing.filter(item =>
        statuses.includes(item.sanityMatch?.status as SanityMatch["status"])
      ),
      label
    );
  };

  const getGroupKey = (item: MissingItem, level: GroupLevel) => {
    if (level === "brand") return item.brand;
    if (level === "model") return `${item.brand}||${item.model || "-"}`;
    return `${item.brand}||${item.model || "-"}||${item.year || "-"}`;
  };

  const getGroupLabel = (item: MissingItem, level: GroupLevel) => {
    if (level === "brand") return item.brand;
    if (level === "model") return `${item.brand} ${item.model || "-"}`;
    return `${item.brand} ${item.model || "-"} ${item.year || "-"}`;
  };

  const buildGroups = (level: GroupLevel, limit: number): SelectionGroup[] => {
    const groups = new Map<string, SelectionGroup>();

    importableFiltered.forEach(item => {
      const key = getGroupKey(item, level);
      const statusKey = item.sanityMatch?.status || "unknown";

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: getGroupLabel(item, level),
          items: [],
          count: 0,
          statuses: {},
        });
      }

      const group = groups.get(key)!;
      group.items.push(item);
      group.count += 1;
      group.statuses[statusKey] = (group.statuses[statusKey] || 0) + 1;
    });

    return Array.from(groups.values())
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limit);
  };

  const yearGroups = buildGroups("year", 14);
  const modelGroups = buildGroups("model", 10);
  const brandGroups = buildGroups("brand", 8);

  const renderGroupButtons = (title: string, groups: SelectionGroup[]) => {
    if (!groups.length) return null;

    return (
      <div>
        <div style={{fontWeight: 700, marginBottom: 8}}>{title}</div>
        <div style={{display: "flex", flexWrap: "wrap", gap: 8}}>
          {groups.map(group => (
            <button
              key={group.key}
              onClick={() => addSelection(group.items, group.label)}
              style={{
                padding: "6px 10px",
                border: "1px solid #cbd5e1",
                borderRadius: 6,
                background: "#fff",
                cursor: "pointer",
                textAlign: "left",
              }}
              title={[
                group.statuses.new_year
                  ? `${group.statuses.new_year} nya årsmodeller`
                  : "",
                group.statuses.new_engine
                  ? `${group.statuses.new_engine} nya motorer`
                  : "",
                group.statuses.missing_stages
                  ? `${group.statuses.missing_stages} saknar steg`
                  : "",
              ]
                .filter(Boolean)
                .join(", ")}
            >
              <span style={{fontWeight: 600}}>{group.label}</span>{" "}
              <span style={{color: "#64748b"}}>({group.count})</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  // NY: Välj specifikt antal nya objekt
  const selectSpecificCount = (count: number) => {
    addSelection(importableFiltered.slice(0, count), `${count} nya objekt`);
  };

  // NY: Välj specifikt antal från alla filtrerade
  const selectSpecificCountFromAll = (count: number) => {
    addSelection(importableFiltered.slice(0, count), `${count} filtrerade`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text) as MissingItem[];

      if (!Array.isArray(json)) {
        alert("Ogiltig JSON-fil. Välj missing_import.json.");
        return;
      }

      setMissing(json);
      setSelected([]);
      setImportResults([]);
      await checkSanityMatches(json);
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
    setSelected(importableFiltered.map(item => getEngineId(item)));
  };

  const deselectAll = () => {
    setSelected([]);
  };

  const selectOnlyNew = () => {
    setSelected(importableFiltered.map(item => getEngineId(item)));
  };

  const handleImport = async () => {
    if (!selected.length) return alert("Välj minst ett objekt.");

    // Varning om många objekt
    if (selected.length > 500) {
      const confirmed = confirm(
        `Du håller på att importera ${selected.length} objekt. Detta kan ta flera minuter. Vill du fortsätta?`
      );
      if (!confirmed) return;
    }

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
        addToImportHistory(selectedItems, data.results);
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
      setImportHistoryEntries([]);
      localStorage.removeItem(IMPORT_HISTORY_KEY);
      localStorage.removeItem(IMPORT_HISTORY_DETAILS_KEY);
      setStatus("Import-historik raderad");
    }
  };

  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(importHistoryEntries, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "import_history.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const slugifyUrlPart = (value = "") => {
    return value
      .toString()
      .toLowerCase()
      .trim()
      .replace(/->/g, "-")
      .replace(/>/g, "-")
      .replace(/\//g, "-")
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-]/g, "")
      .replace(/-+/g, "-");
  };

  const slugifyStage = (value = "") => {
    return value
      .toString()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]/g, "")
      .replace(/-+/g, "-");
  };

  const escapeXml = (value: string) => {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const buildSitemapXml = (entries: ImportHistoryEntry[]) => {
    const lastmod = new Date().toISOString();
    const urls = new Set<string>();

    entries
      .filter(entry => entry.status === "created" || entry.status === "exists")
      .forEach(entry => {
        const brand = slugifyUrlPart(entry.brand);
        const model = slugifyUrlPart(entry.model || "");
        const year = slugifyUrlPart(entry.year || "");
        const engine = slugifyUrlPart(entry.engine || "");

        if (!brand || !model || !year || !engine) return;

        const engineUrl = `https://tuning.aktuning.se/${brand}/${model}/${year}/${engine}`;
        urls.add(engineUrl);

        entry.stages.forEach(stage => {
          const stageSlug = slugifyStage(stage);
          if (stageSlug) {
            urls.add(`${engineUrl}/${stageSlug}`);
          }
        });
      });

    const body = Array.from(urls)
      .sort()
      .map(
        url =>
          `<url><loc>${escapeXml(url)}</loc><lastmod>${lastmod}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>`
      )
      .join("\n");

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  };

  const downloadTextFile = (filename: string, content: string, type: string) => {
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportTodaySitemap = () => {
    const today = new Date().toISOString().slice(0, 10);
    const todayEntries = importHistoryEntries.filter(
      entry => entry.importedAt.slice(0, 10) === today
    );

    if (!todayEntries.length) {
      alert("Det finns inga importer i historiken för idag.");
      return;
    }

    const xml = buildSitemapXml(todayEntries);
    downloadTextFile(`sitemap-imported-${today}.xml`, xml, "application/xml");
  };

  const stats = {
    total: missing.length,
    new: missing.filter(canImportItem).length,
    imported: missing.filter(item => isAlreadyImported(item)).length,
    exists: missing.filter(item => item.sanityMatch?.status === "exists").length,
    missingStages: missing.filter(
      item => item.sanityMatch?.status === "missing_stages"
    ).length,
    newYears: missing.filter(item => item.sanityMatch?.status === "new_year")
      .length,
    newEngines: missing.filter(item => item.sanityMatch?.status === "new_engine")
      .length,
    newModels: missing.filter(item => item.sanityMatch?.status === "new_model")
      .length,
    newStructure: missing.filter(item =>
      ["new_engine", "new_year", "new_model"].includes(
        item.sanityMatch?.status || ""
      )
    ).length,
    missingBrands: missing.filter(
      item => item.sanityMatch?.status === "missing_brand"
    ).length,
    filtered: filteredMissing.length,
    selectedNew: selected.filter(id => {
      const item = missing.find(m => getEngineId(m) === id);
      return item && canImportItem(item);
    }).length,
  };

  return (
    <div>
      <div style={{display: "flex", gap: 10, marginBottom: 20}}>
        <button
          onClick={() => setActiveCarView("import")}
          style={{
            padding: "8px 14px",
            background: activeCarView === "import" ? "#198754" : "#f8f9fa",
            color: activeCarView === "import" ? "white" : "#333",
            border: "1px solid #ced4da",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Import
        </button>
        <button
          onClick={() => setActiveCarView("history")}
          style={{
            padding: "8px 14px",
            background: activeCarView === "history" ? "#198754" : "#f8f9fa",
            color: activeCarView === "history" ? "white" : "#333",
            border: "1px solid #ced4da",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Historik ({importHistoryEntries.length})
        </button>
      </div>

      {activeCarView === "history" ? (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 15,
            }}
          >
            <h3 style={{margin: 0}}>Importhistorik</h3>
            <div style={{display: "flex", gap: 8}}>
              <button
                onClick={exportTodaySitemap}
                disabled={!importHistoryEntries.length}
                style={{
                  padding: "7px 12px",
                  background: importHistoryEntries.length ? "#198754" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: importHistoryEntries.length ? "pointer" : "not-allowed",
                }}
              >
                Exportera sitemap för idag
              </button>
              <button
                onClick={exportHistory}
                disabled={!importHistoryEntries.length}
                style={{
                  padding: "7px 12px",
                  background: importHistoryEntries.length ? "#0d6efd" : "#ccc",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: importHistoryEntries.length ? "pointer" : "not-allowed",
                }}
              >
                Exportera historik
              </button>
              <button
                onClick={clearHistory}
                style={{
                  padding: "7px 12px",
                  background: "#dc3545",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Rensa historik
              </button>
            </div>
          </div>

          {importHistoryEntries.length ? (
            <div style={{overflowX: "auto"}}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead>
                  <tr style={{background: "#f1f5f9"}}>
                    {[
                      "Datum",
                      "Status",
                      "Action",
                      "Märke",
                      "Modell",
                      "År",
                      "Motor",
                      "Steg",
                      "Meddelande",
                    ].map(heading => (
                      <th
                        key={heading}
                        style={{
                          padding: 8,
                          border: "1px solid #cbd5e1",
                          textAlign: "left",
                        }}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {importHistoryEntries.map(entry => (
                    <tr key={entry.id}>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {new Date(entry.importedAt).toLocaleString("sv-SE")}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        <span
                          style={{
                            color:
                              entry.status === "created"
                                ? "#198754"
                                : entry.status === "exists"
                                  ? "#64748b"
                                  : "#dc3545",
                            fontWeight: 700,
                          }}
                        >
                          {entry.status}
                        </span>
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.action || "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.brand}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.model || "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.year || "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.engine || "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.stages.length ? entry.stages.join(", ") : "-"}
                      </td>
                      <td style={{padding: 8, border: "1px solid #cbd5e1"}}>
                        {entry.message || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              style={{
                padding: 30,
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                textAlign: "center",
                color: "#64748b",
              }}
            >
              Ingen importhistorik ännu.
            </div>
          )}
        </div>
      ) : (
        <>
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
              <strong>Importbara:</strong> {stats.new}
            </div>
            <div style={{color: "#6c757d"}}>
              <strong>Finns redan:</strong> {stats.exists || stats.imported}
            </div>
            <div style={{color: "#b45309"}}>
              <strong>Saknar steg:</strong> {stats.missingStages}
            </div>
            <div style={{color: "#007bff"}}>
              <strong>Nya i struktur:</strong> {stats.newStructure}
            </div>
            <div style={{color: "#dc3545"}}>
              <strong>Saknar märke:</strong> {stats.missingBrands}
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
      {checkingSanity && <p>Kontrollerar mot Sanity...</p>}

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

            <div style={{display: "flex", gap: 5, flexWrap: "wrap"}}>
              {[
                ["needs_import", "Att importera"],
                ["exists", "Finns redan"],
                ["missing_stages", "Saknar steg"],
                ["new_structure", "Ny struktur"],
                ["all", "Alla"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() =>
                    setFilters(prev => ({
                      ...prev,
                      status: value as StatusFilter,
                    }))
                  }
                  style={{
                    padding: "5px 10px",
                    background:
                      filters.status === value ? "#198754" : "#f8f9fa",
                    color: filters.status === value ? "white" : "#333",
                    border: "1px solid #ced4da",
                    borderRadius: 4,
                    cursor: "pointer",
                  }}
                >
                  {label}
                </button>
              ))}
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
                title="Välj 100 nya"
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
                title="Välj 200 nya"
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
                title="Välj 500 nya"
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
                title="Välj 100 från filtrerade"
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
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #dbeafe",
              borderRadius: 8,
              padding: 15,
              marginBottom: 20,
            }}
          >
            <h3 style={{marginTop: 0, marginBottom: 12}}>Snabbmarkering</h3>

            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                marginBottom: 16,
              }}
            >
              <button
                onClick={() => addSelection(importableFiltered, "alla importbara")}
                style={{
                  padding: "7px 12px",
                  background: "#198754",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Markera alla importbara ({importableFiltered.length})
              </button>
              <button
                onClick={() => selectBySanityStatus(["new_year"], "nya årsmodeller")}
                style={{
                  padding: "7px 12px",
                  background: "#0d6efd",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Markera nya årsmodeller ({stats.newYears})
              </button>
              <button
                onClick={() => selectBySanityStatus(["new_engine"], "nya motorer")}
                style={{
                  padding: "7px 12px",
                  background: "#0d6efd",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Markera nya motorer ({stats.newEngines})
              </button>
              <button
                onClick={() =>
                  selectBySanityStatus(["missing_stages"], "saknade steg")
                }
                style={{
                  padding: "7px 12px",
                  background: "#b45309",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Markera saknade steg ({stats.missingStages})
              </button>
              <button
                onClick={() => selectBySanityStatus(["new_model"], "nya modeller")}
                style={{
                  padding: "7px 12px",
                  background: "#6f42c1",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: "pointer",
                }}
              >
                Markera nya modeller ({stats.newModels})
              </button>
            </div>

            <div style={{display: "grid", gap: 16}}>
              {renderGroupButtons("Årsmodeller i aktuell filtrering", yearGroups)}
              {renderGroupButtons("Modeller i aktuell filtrering", modelGroups)}
              {renderGroupButtons("Märken i aktuell filtrering", brandGroups)}
            </div>
          </div>

          <ImportTable
            missing={filteredMissing}
            selected={selected}
            onToggle={toggleSelect}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
            onSelectOnlyNew={selectOnlyNew}
            isAlreadyImported={isAlreadyImported}
            canImportItem={canImportItem}
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
              Markera alla nya ({stats.new})
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
        </>
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
            }}
          >
            🏍️ Bikes/Quads
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "cars" && <CarImport />}
        {activeTab === "jetskis" && (
          <Suspense fallback={<LoadingFallback />}>
            <JetSkiImport />
          </Suspense>
        )}
        {activeTab === "bikes" && (
          <Suspense fallback={<LoadingFallback />}>
            <BikeImport />
          </Suspense>
        )}
      </div>
    </div>
  );
}

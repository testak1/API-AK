import React, { useEffect, useState } from "react";

interface DtcEntry {
  code: string;
  description: string;
}

const DtcSearch: React.FC = () => {
  const [dtcData, setDtcData] = useState<DtcEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredResults, setFilteredResults] = useState<DtcEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDtcData = async () => {
      try {
        const response = await fetch("/dtc.json");
        if (!response.ok) throw new Error("Failed to load");
        const data = await response.json();
        setDtcData(data);
      } catch (err) {
        setError("Fel: Kunde inte hämta DTC-data.");
      }
    };

    fetchDtcData();
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length === 0) {
      setFilteredResults([]);
      return;
    }

    const lower = searchTerm.toLowerCase();
    const results = dtcData.filter(
      (entry) =>
        entry.code.toLowerCase().includes(lower) ||
        entry.description.toLowerCase().includes(lower)
    );
    setFilteredResults(results);
  }, [searchTerm, dtcData]);

  return (
    <div className="bg-gray-800 text-white p-6 rounded-lg shadow-md mt-4">
      <h2 className="text-lg font-semibold mb-2">🔍 SÖK DTC</h2>
      <input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="T.ex. P0401 eller EGR"
        className="w-full p-3 mb-4 rounded bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="text-red-400 text-sm mb-2">{error}</p>}

      {filteredResults.length > 0 && (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {filteredResults.map((entry, index) => (
            <li key={index} className="p-2 border border-gray-600 rounded">
              <strong className="text-orange-400">{entry.code}</strong>:{" "}
              <span>{entry.description}</span>
            </li>
          ))}
        </ul>
      )}

      {searchTerm && filteredResults.length === 0 && !error && (
        <p className="text-sm text-gray-400">Inga träffar.</p>
      )}
    </div>
  );
};

export default DtcSearch;

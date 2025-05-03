import React, { useState } from "react";

interface DTC {
  code: string;
  description: string;
}

export default function DtcSearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<DTC | null>(null);
  const [error, setError] = useState("");

  const searchDTC = async () => {
    try {
      const res = await fetch(
        "https://portal.c4l1brate.com/assets/data/dtc.json"
      );
      const data: DTC[] = await res.json();
      const match = data.find(
        (item) => item.code.toLowerCase() === query.trim().toLowerCase()
      );

      if (match) {
        setResult(match);
        setError("");
      } else {
        setResult(null);
        setError("Ingen beskrivning hittades för denna kod.");
      }
    } catch (err) {
      console.error(err);
      setError("Kunde inte hämta DTC-data.");
    }
  };

  return (
    <div className="mt-4 text-white">
      <label htmlFor="dtc-code" className="block text-sm font-medium">
        Sök DTC kod:
      </label>
      <div className="flex gap-2 mt-1">
        <input
          type="text"
          id="dtc-code"
          className="w-full p-2 rounded bg-gray-800 border border-gray-600"
          placeholder="Ex: P0420"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          onClick={searchDTC}
          className="bg-orange-500 px-4 rounded hover:bg-orange-600"
        >
          Sök
        </button>
      </div>
      {result && (
        <p className="mt-2 text-sm text-green-400">
          <strong>{result.code}</strong>: {result.description}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-400">
          <strong>Fel:</strong> {error}
        </p>
      )}
    </div>
  );
}

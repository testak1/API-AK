// components/RegnrSearch.tsx
import React, { useState } from 'react';

// Uppdaterad typ för att inkludera motorvolym i cm³
type OnVehicleFound = (vehicle: {
  brand: string;
  model: string;
  year: string;
  fuel: string;
  powerHp: string;
  engineCm3: string; // <-- NY: Motorvolym i cm3
}) => void;

type OnError = (message: string | null) => void;

export default function RegnrSearch({ onVehicleFound, onError }: { onVehicleFound: OnVehicleFound, onError: OnError }) {
  const [regnr, setRegnr] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!regnr) return;
    setIsLoading(true);
    setError(null);
    onError(null);

    const targetUrl = `https://biluppgifter.se/fordon/${regnr.toUpperCase()}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Nätverksfel (Status: ${response.status}).`);
      
      const htmlContent = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      
      // Hämta grundläggande data
      const summarySection = doc.querySelector('section#summary .bar.summary .info');
      const iconGrid = doc.querySelector('section#summary ul.icon-grid');
      if (!summarySection || !iconGrid) throw new Error('Kunde inte hitta huvudinformationen.');
      
      const h1 = summarySection.querySelector('h1');
      if (!h1) throw new Error('Kunde inte hitta H1-taggen.');
      const fullName = h1.innerText.trim();
      const brand = fullName.split(' ')[0];
      const model = fullName.substring(brand.length).trim();

      let year: string | null = null;
      let fuel: string | null = null;
      let powerHp: string | null = null;
      iconGrid.querySelectorAll('li').forEach(item => {
        const label = item.querySelector('span')?.innerText.trim().toLowerCase();
        const value = item.querySelector('em')?.innerText.trim();
        if (label === 'modellår') year = value?.match(/\d{4}/)?.[0] || null;
        if (label === 'bränsle') fuel = value || null;
        if (label === 'hästkrafter') powerHp = value?.match(/(\d+)/)?.[0] || null;
      });

      // NY LOGIK: Hämta motorvolym i cm³
      let engineCm3: string | null = null;
      doc.querySelectorAll('#tekniskdata .inner ul.list li').forEach(item => {
        const label = item.querySelector('span.label')?.innerText.trim().toLowerCase();
        if (label === 'motorvolym') {
          const value = item.querySelector('span.value')?.innerText.trim();
          engineCm3 = value?.match(/(\d+)/)?.[0] || null; // Extrahera "1197"
        }
      });

      if (!brand || !model || !year || !fuel || !powerHp || !engineCm3) {
        const missing = [!year&&"År", !fuel&&"Bränsle", !powerHp&&"Effekt", !engineCm3&&"Motorvolym"].filter(Boolean).join(', ');
        throw new Error(`Kunde inte extrahera: ${missing}.`);
      }
      
      onVehicleFound({ brand, model, year, fuel, powerHp, engineCm3 });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Ett okänt fel uppstod.';
      setError(errorMessage);
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    // Din JSX för komponenten (ingen ändring här)
    <details className="mb-8 bg-gray-900/50 border border-gray-700 rounded-lg group">
      <summary className="p-4 cursor-pointer flex justify-between items-center list-none">
        <div className="flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="font-semibold text-white">
            REGNR (BETA)
          </span>
        </div>
        <svg className="w-5 h-5 text-gray-400 transform transition-transform group-open:rotate-180" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </summary>
      <div className="p-4 border-t border-gray-700">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={regnr}
            onChange={(e) => setRegnr(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="ABC 123"
            className="flex-grow p-3 rounded-lg bg-gray-800 border border-gray-600 text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-center text-lg font-mono tracking-widest"
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="p-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-all shadow-md disabled:bg-gray-500 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Sök fordon'
            )}
          </button>
        </div>
        {error && <p className="text-red-400 mt-3 text-center">{error}</p>}
      </div>
    </details>
  );
}

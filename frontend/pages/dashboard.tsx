// pages/dashboard.tsx
import React, { useEffect, useState } from "react";

const DashboardPage = () => {
  const [overrides, setOverrides] = useState<any[]>([]); // typa bättre senare
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverrides = async () => {
      try {
        const res = await fetch(`/api/overrides?resellerId=ak-ab123`); // TODO: dynamiskt senare
        const data = await res.json();
        setOverrides(data.overrides || []);
      } catch (err) {
        console.error("Kunde inte hämta overrides", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOverrides();
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <h1 className="text-3xl font-bold mb-6">Återförsäljare Dashboard</h1>
      <p className="text-gray-300 mb-8">
        Här ser du dina override-inställningar för motorer.
      </p>

      {loading ? (
        <p className="text-gray-400">Laddar data...</p>
      ) : overrides.length > 0 ? (
        <ul className="space-y-4">
          {overrides.map((o) => (
            <li
              key={o._id}
              className="border border-gray-700 p-4 rounded-lg bg-gray-800"
            >
              <p className="font-semibold text-lg mb-2">
                {o.brand} {o.model} {o.year} {o.engine}
              </p>
              <p>💰 Pris: {o.overridePrice ?? "Standard"}</p>
              <p>
                🏁 Effekt: {o.overrideHp ?? "Standard"} hk /{" "}
                {o.overrideNm ?? "Standard"} Nm
              </p>
              <p>⚙️ AKT+ synlig: {o.showAktPlus ? "✅ Ja" : "❌ Nej"}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400">Inga overrides har skapats ännu.</p>
      )}
    </div>
  );
};

export default DashboardPage;

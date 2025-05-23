import { useEffect, useState } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { signOut } from "next-auth/react";

export default function ResellerAdmin({ session }) {
  const [brands, setBrands] = useState([]);
  const [overrides, setOverrides] = useState([]);

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("/api/brands-with-overrides");
        const { brands, overrides } = await res.json();
        setBrands(brands || []);
        setOverrides(overrides || []);
      } catch (err) {
        console.error("Error fetching brand data:", err);
      }
    };
    fetchData();
  }, []);

  const [currency, setCurrency] = useState("SEK");
  const [language, setLanguage] = useState("sv");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/reseller-config");
        const json = await res.json();
        if (json.currency) setCurrency(json.currency);
        if (json.language) setLanguage(json.language);
      } catch (err) {
        console.error("Failed to load reseller settings", err);
      }
    };
    fetchSettings();
  }, []);

  const handleSettingsSave = async () => {
    try {
      await fetch("/api/update-reseller-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, language }),
      });
      alert("Settings saved!");
    } catch (err) {
      console.error("Error updating settings", err);
      alert("Failed to save settings.");
    }
  };

  const findOverride = (brand, model, year, engine, stageName) =>
    overrides.find(
      (o) =>
        o.brand === brand &&
        o.model === model &&
        o.year === year &&
        o.engine === engine &&
        o.stageName === stageName,
    );

  const handleSave = async (
    overrideId,
    brand,
    model,
    year,
    engine,
    stageName,
    price,
    hk,
    nm,
  ) => {
    try {
      await fetch("/api/overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          overrideId,
          brand,
          model,
          year,
          engine,
          stageName,
          price,
          tunedHk: hk,
          tunedNm: nm,
        }),
      });
      alert("Saved");
    } catch (error) {
      console.error("Failed to save override:", error);
      alert("Error saving override");
    }
  };

  const selectedStages =
    brands
      .find((b) => b.name === selectedBrand)
      ?.models?.find((m) => m.name === selectedModel)
      ?.years?.find((y) => y.range === selectedYear)
      ?.engines?.find((e) => e.label === selectedEngine)?.stages || [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Reseller Admin</h1>
      <button
        className="mb-4 underline text-blue-500"
        onClick={() => signOut()}
      >
        Sign out
      </button>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-2">Reseller Settings</h2>

        <label className="block mt-4">Currency</label>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
          <option value="SEK">SEK (kr)</option>
          <option value="EUR">EUR (€)</option>
          <option value="USD">USD ($)</option>
        </select>

        <label className="block mt-4">Language</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="sv">Swedish</option>
          <option value="en">English</option>
        </select>

        <button onClick={handleSettingsSave}>Save Settings</button>
      </div>

      <div className="space-y-4">
        <select
          value={selectedBrand}
          onChange={(e) => {
            setSelectedBrand(e.target.value);
            setSelectedModel("");
            setSelectedYear("");
            setSelectedEngine("");
          }}
          className="w-full p-2 border rounded"
        >
          <option value="">Select Brand</option>
          {brands.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        {selectedBrand && (
          <select
            value={selectedModel}
            onChange={(e) => {
              setSelectedModel(e.target.value);
              setSelectedYear("");
              setSelectedEngine("");
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Model</option>
            {brands
              .find((b) => b.name === selectedBrand)
              ?.models?.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name}
                </option>
              ))}
          </select>
        )}

        {selectedModel && (
          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setSelectedEngine("");
            }}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Year</option>
            {brands
              .find((b) => b.name === selectedBrand)
              ?.models?.find((m) => m.name === selectedModel)
              ?.years?.map((y) => (
                <option key={y.range} value={y.range}>
                  {y.range}
                </option>
              ))}
          </select>
        )}

        {selectedYear && (
          <select
            value={selectedEngine}
            onChange={(e) => setSelectedEngine(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Select Engine</option>
            {brands
              .find((b) => b.name === selectedBrand)
              ?.models?.find((m) => m.name === selectedModel)
              ?.years?.find((y) => y.range === selectedYear)
              ?.engines?.map((e) => (
                <option key={e.label} value={e.label}>
                  {e.label}
                </option>
              ))}
          </select>
        )}
      </div>

      <div className="mt-6 space-y-6">
        {selectedStages.map((stage) => {
          const override = findOverride(
            selectedBrand,
            selectedModel,
            selectedYear,
            selectedEngine,
            stage.name,
          );
          return (
            <div key={stage.name} className="border p-4 rounded">
              <p className="font-semibold">{stage.name}</p>
              <p>
                Base: {stage.price} kr | {stage.tunedHk} HK | {stage.tunedNm} NM
              </p>
              <input
                id={`price-${stage.name}`}
                defaultValue={override?.price ?? stage.price}
                className="block border p-1 mt-2 w-full"
                placeholder="Price"
              />

              <input
                id={`hk-${stage.name}`}
                defaultValue={override?.tunedHk ?? stage.tunedHk}
                className="block border p-1 mt-2 w-full"
                placeholder="HK"
              />
              <input
                id={`nm-${stage.name}`}
                defaultValue={override?.tunedNm ?? stage.tunedNm}
                className="block border p-1 mt-2 w-full"
                placeholder="NM"
              />
              <button
                className="mt-2 px-4 py-1 bg-green-600 text-white rounded"
                onClick={() =>
                  handleSave(
                    override?._id || null,
                    selectedBrand,
                    selectedModel,
                    selectedYear,
                    selectedEngine,
                    stage.name,
                    +(
                      document.getElementById(
                        `price-${stage.name}`,
                      ) as HTMLInputElement
                    ).value,
                    +(
                      document.getElementById(
                        `hk-${stage.name}`,
                      ) as HTMLInputElement
                    ).value,
                    +(
                      document.getElementById(
                        `nm-${stage.name}`,
                      ) as HTMLInputElement
                    ).value,
                  )
                }
              >
                Save
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false,
      },
    };
  }

  return {
    props: { session },
  };
}

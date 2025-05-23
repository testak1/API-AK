import { useEffect, useState } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { signOut } from "next-auth/react";

export default function ResellerAdmin({ session }) {
  const [brands, setBrands] = useState([]);
  const [overrides, setOverrides] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState({ message: "", isError: false });

  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedEngine, setSelectedEngine] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/brands-with-overrides");
        const { brands, overrides } = await res.json();
        setBrands(brands || []);
        setOverrides(overrides || []);
      } catch (err) {
        console.error("Error fetching brand data:", err);
      } finally {
        setIsLoading(false);
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
      setIsLoading(true);
      await fetch("/api/update-reseller-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, language }),
      });
      setSaveStatus({
        message: "Settings saved successfully!",
        isError: false,
      });
    } catch (err) {
      console.error("Error updating settings", err);
      setSaveStatus({ message: "Failed to save settings.", isError: true });
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
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
      setIsLoading(true);
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
      setSaveStatus({
        message: "Override saved successfully!",
        isError: false,
      });
    } catch (error) {
      console.error("Failed to save override:", error);
      setSaveStatus({ message: "Error saving override", isError: true });
    } finally {
      setIsLoading(false);
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
    }
  };

  const selectedStages =
    brands
      .find((b) => b.name === selectedBrand)
      ?.models?.find((m) => m.name === selectedModel)
      ?.years?.find((y) => y.range === selectedYear)
      ?.engines?.find((e) => e.label === selectedEngine)?.stages || [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              Reseller Admin Panel
            </h1>
            <p className="text-gray-600">
              Manage your tuning configurations and settings
            </p>
          </div>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
            onClick={() => signOut()}
          >
            Sign out
          </button>
        </div>

        {saveStatus.message && (
          <div
            className={`mb-6 p-4 rounded-md ${saveStatus.isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
          >
            {saveStatus.message}
          </div>
        )}

        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Reseller Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="SEK">SEK (kr)</option>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="sv">Swedish</option>
                <option value="en">English</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSettingsSave}
            disabled={isLoading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Saving..." : "Save Settings"}
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">
            Vehicle Configuration
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value);
                  setSelectedModel("");
                  setSelectedYear("");
                  setSelectedEngine("");
                }}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={isLoading}
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedBrand && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => {
                    setSelectedModel(e.target.value);
                    setSelectedYear("");
                    setSelectedEngine("");
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
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
              </div>
            )}

            {selectedModel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Year
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                    setSelectedEngine("");
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
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
              </div>
            )}

            {selectedYear && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Engine
                </label>
                <select
                  value={selectedEngine}
                  onChange={(e) => setSelectedEngine(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
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
              </div>
            )}
          </div>
        </div>

        {selectedStages.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-700">
              Tuning Stages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedStages.map((stage) => {
                const override = findOverride(
                  selectedBrand,
                  selectedModel,
                  selectedYear,
                  selectedEngine,
                  stage.name,
                );
                return (
                  <div
                    key={stage.name}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-bold text-lg text-blue-600 mb-2">
                      {stage.name}
                    </h3>
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        Base Configuration
                      </p>
                      <p className="text-gray-700">
                        {stage.price} kr | {stage.tunedHk} HK | {stage.tunedNm}{" "}
                        NM
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Price (kr)
                        </label>
                        <input
                          id={`price-${stage.name}`}
                          defaultValue={override?.price ?? stage.price}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          type="number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Horsepower (HK)
                        </label>
                        <input
                          id={`hk-${stage.name}`}
                          defaultValue={override?.tunedHk ?? stage.tunedHk}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          type="number"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Custom Torque (NM)
                        </label>
                        <input
                          id={`nm-${stage.name}`}
                          defaultValue={override?.tunedNm ?? stage.tunedNm}
                          className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          type="number"
                        />
                      </div>
                    </div>

                    <button
                      className="mt-4 w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                      disabled={isLoading}
                    >
                      {isLoading ? "Saving..." : "Save Customization"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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

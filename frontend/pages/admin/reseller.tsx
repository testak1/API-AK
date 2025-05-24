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

  // State to manage form inputs separately for each engine
  const [stageInputs, setStageInputs] = useState({});

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
        setSaveStatus({
          message: "Failed to load vehicle data",
          isError: true,
        });
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
        setSaveStatus({ message: "Failed to load settings", isError: true });
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
      const response = await fetch("/api/overrides", {
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

      if (!response.ok) throw new Error("Failed to save");

      // Update the overrides state with the new data
      const updatedOverride = await response.json();
      setOverrides((prev) => {
        const existing = prev.find((o) => o._id === updatedOverride._id);
        if (existing) {
          return prev.map((o) =>
            o._id === updatedOverride._id ? updatedOverride : o,
          );
        }
        return [...prev, updatedOverride];
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

  // Reset stage inputs when engine changes
  useEffect(() => {
    setStageInputs({});
  }, [selectedEngine]);

  const handleInputChange = (stageName, field, value) => {
    setStageInputs((prev) => ({
      ...prev,
      [stageName]: {
        ...prev[stageName],
        [field]: value,
      },
    }));
  };

  const selectedStages =
    brands
      .find((b) => b.name === selectedBrand)
      ?.models?.find((m) => m.name === selectedModel)
      ?.years?.find((y) => y.range === selectedYear)
      ?.engines?.find((e) => e.label === selectedEngine)?.stages || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 text-white p-4 md:p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                Reseller Admin Panel
              </h1>
              <p className="text-gray-300">
                Manage your tuning configurations and settings
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-sm md:text-base">
                Logged in as:{" "}
                <span className="font-medium">{session.user.email}</span>
              </span>
              <button
                className="px-3 py-1 md:px-4 md:py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm md:text-base"
                onClick={() => signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="p-4 md:p-6">
          {saveStatus.message && (
            <div
              className={`mb-6 p-4 rounded-md ${saveStatus.isError ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}
            >
              {saveStatus.message}
            </div>
          )}

          {/* Settings Section */}
          <div className="mb-8 p-4 md:p-6 bg-gray-50 rounded-lg border border-gray-200">
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
                  <option value="de">Deutch</option>
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

          {/* Vehicle Selection */}
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

          {/* Tuning Stages */}
          {selectedStages.length > 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-700">
                  Tuning Stages
                </h2>
                <span className="text-sm text-gray-500">
                  {selectedBrand} {selectedModel} {selectedYear}{" "}
                  {selectedEngine}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedStages.map((stage) => {
                  const override = findOverride(
                    selectedBrand,
                    selectedModel,
                    selectedYear,
                    selectedEngine,
                    stage.name,
                  );

                  // Get current input values or fallback to override or default values
                  const currentInputs = stageInputs[stage.name] || {};
                  const price =
                    currentInputs.price ?? override?.price ?? stage.price;
                  const hk =
                    currentInputs.hk ?? override?.tunedHk ?? stage.tunedHk;
                  const nm =
                    currentInputs.nm ?? override?.tunedNm ?? stage.tunedNm;

                  return (
                    <div
                      key={stage.name}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-lg text-blue-600">
                          {stage.name}
                        </h3>
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          Stage {stage.name.replace(/\D/g, "")}
                        </span>
                      </div>

                      {/* Original Configuration */}
                      <div className="mb-2 p-3 bg-gray-100 rounded">
                        <p className="text-sm text-gray-600 font-medium mb-1">
                          Original Configuration
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Original HP</p>
                            <p>{stage.origHk} HK</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Original Torque</p>
                            <p>{stage.origNm} NM</p>
                          </div>
                        </div>
                      </div>

                      {/* Base Configuration */}
                      <div className="mb-3 p-3 bg-gray-50 rounded">
                        <p className="text-sm text-gray-600 font-medium mb-1">
                          Base Configuration
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <div>
                            <p className="text-gray-500">Price</p>
                            <p>{stage.price} kr</p>
                          </div>
                          <div>
                            <p className="text-gray-500">HP</p>
                            <p>{stage.tunedHk} HK</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Torque</p>
                            <p>{stage.tunedNm} NM</p>
                          </div>
                        </div>
                      </div>

                      {/* Custom Configuration */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Price (kr)
                          </label>
                          <input
                            value={price}
                            onChange={(e) =>
                              handleInputChange(
                                stage.name,
                                "price",
                                e.target.value,
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Horsepower (HK)
                          </label>
                          <input
                            value={hk}
                            onChange={(e) =>
                              handleInputChange(
                                stage.name,
                                "hk",
                                e.target.value,
                              )
                            }
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            type="number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Custom Torque (NM)
                          </label>
                          <input
                            value={nm}
                            onChange={(e) =>
                              handleInputChange(
                                stage.name,
                                "nm",
                                e.target.value,
                              )
                            }
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
                            Number(price),
                            Number(hk),
                            Number(nm),
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

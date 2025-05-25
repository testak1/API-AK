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

  const [stageInputs, setStageInputs] = useState({});
  const [currency, setCurrency] = useState("SEK");
  const [language, setLanguage] = useState("sv");
  const [activeTab, setActiveTab] = useState("tuning");

  // New state for General tab
  const [bulkPrices, setBulkPrices] = useState({
    stage1: "",
    stage2: "",
    applyLevel: "model", // 'model' or 'year'
  });

  const [stageDescriptions, setStageDescriptions] = useState([]);

  useEffect(() => {
    const fetchDescriptions = async () => {
      try {
        const res = await fetch("/api/stage-descriptions");
        const { descriptions } = await res.json();
        setStageDescriptions(descriptions || []);
      } catch (err) {
        console.error("Failed to load stage descriptions", err);
      }
    };

    if (session?.user?.resellerId) {
      fetchDescriptions();
    }
  }, [session]);

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

  useEffect(() => {
    if (!session?.user?.resellerId) return;
    fetch("/api/general-info")
      .then((res) => res.json())
      .then((json) => setGeneralInfo(json.generalInfo || {}));
  }, [session]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(
          `/api/reseller-config?resellerId=${session.user.resellerId}`
        );
        const json = await res.json();
        if (json.currency) setCurrency(json.currency);
        if (json.language) setLanguage(json.language);
      } catch (err) {
        console.error("Failed to load reseller settings", err);
        setSaveStatus({ message: "Failed to load settings", isError: true });
      }
    };

    if (session?.user?.resellerId) {
      fetchSettings();
    }
  }, [session]);

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

  // New function to handle bulk price save
  const handleBulkPriceSave = async () => {
    if (
      !selectedBrand ||
      (!selectedModel && bulkPrices.applyLevel === "model") ||
      (!selectedYear && bulkPrices.applyLevel === "year")
    ) {
      setSaveStatus({
        message: "Please select brand and model/year",
        isError: true,
      });
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/bulk-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          model: bulkPrices.applyLevel === "model" ? selectedModel : undefined,
          year: bulkPrices.applyLevel === "year" ? selectedYear : undefined,
          stage1Price: bulkPrices.stage1,
          stage2Price: bulkPrices.stage2,
          resellerId: session.user.resellerId,
        }),
      });

      if (!response.ok) throw new Error("Failed to save bulk prices");

      // ✅ Refetch updated data after save
      const refreshed = await fetch("/api/brands-with-overrides");
      const { brands: refreshedBrands, overrides: refreshedOverrides } =
        await refreshed.json();
      setBrands(refreshedBrands);
      setOverrides(refreshedOverrides);

      setSaveStatus({
        message: "Bulk prices saved successfully!",
        isError: false,
      });
    } catch (error) {
      console.error("Failed to save bulk prices:", error);
      setSaveStatus({ message: "Error saving bulk prices", isError: true });
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
        o.stageName === stageName
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
    nm
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

      const updatedOverride = await response.json();
      setOverrides((prev) => {
        const existing = prev.find((o) => o._id === updatedOverride._id);
        if (existing) {
          return prev.map((o) =>
            o._id === updatedOverride._id ? updatedOverride : o
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

  const [aktPlusOverrides, setAktPlusOverrides] = useState([]);
  const [aktPlusInputs, setAktPlusInputs] = useState({});

  useEffect(() => {
    if (!session?.user?.resellerId) return;

    const fetchAktPlus = async () => {
      try {
        const res = await fetch("/api/aktplus-overrides");
        const json = await res.json();
        setAktPlusOverrides(json.aktplus || []);
      } catch (err) {
        console.error("Failed to load AKTPLUS data", err);
      }
    };

    fetchAktPlus();
  }, [session]);

  useEffect(() => {
    setBulkPrices((prev) => ({
      ...prev,
      stage1: "",
      stage2: "",
    }));
  }, [selectedBrand, selectedModel, selectedYear, bulkPrices.applyLevel]);

  const handleBulkPriceChange = (field, value) => {
    setBulkPrices((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const currencySymbols = {
    SEK: "kr",
    EUR: "€",
    USD: "$",
    GBP: "£",
  };

  const convertCurrency = (amount: number, currency: string): number => {
    const rates = { EUR: 0.1, USD: 0.1, GBP: 0.08 };
    return Math.round(amount * (rates[currency] || 1));
  };

  const getBulkOverridePrice = (stageName) => {
    const match = overrides.find(
      (o) =>
        o.brand === selectedBrand &&
        (bulkPrices.applyLevel === "model"
          ? o.model === selectedModel
          : o.year === selectedYear) &&
        o.stageName === stageName &&
        !o.engine
    );
    return match?.price || "";
  };

  const selectedStages =
    brands
      .find((b) => b.name === selectedBrand)
      ?.models?.find((m) => m.name === selectedModel)
      ?.years?.find((y) => y.range === selectedYear)
      ?.engines?.find((e) => e.label === selectedEngine)?.stages || [];

  const descriptionEntry = stageDescriptions.find(
    (d) => d.stageName === selectedStages[0]?.name
  );

  const [generalInfo, setGeneralInfo] = useState({
    content: [],
    isOverride: false,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  Reseller Portal
                </h1>
                <p className="text-blue-100 text-sm">
                  Customize and manage your tuning configurations
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-blue-700/50 px-3 py-1 rounded-full">
                <span className="h-2 w-2 bg-green-400 rounded-full"></span>
                <span className="text-sm">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="text-sm">Sign out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Status Message */}
        {saveStatus.message && (
          <div
            className={`mb-6 p-4 rounded-lg shadow-sm ${
              saveStatus.isError
                ? "bg-red-50 border-l-4 border-red-500 text-red-700"
                : "bg-green-50 border-l-4 border-green-500 text-green-700"
            }`}
          >
            <div className="flex items-center">
              {saveStatus.isError ? (
                <svg
                  className="h-5 w-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5 mr-3"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span>{saveStatus.message}</span>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("tuning")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "tuning"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Tuning Configurations
            </button>
            <button
              onClick={() => setActiveTab("general")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "general"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              General Pricing
            </button>
            <button
              onClick={() => setActiveTab("descriptions")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "descriptions"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Stage Descriptions
            </button>
            <button
              onClick={() => setActiveTab("generalInfo")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "generalInfo"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              General Info
            </button>
            <button
              onClick={() => setActiveTab("aktplus")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "aktplus"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              ADDITIONAL OPTIONS
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === "settings"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              Reseller Settings
            </button>
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Bulk Pricing Configuration
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Apply standard pricing to all vehicles at model or year level
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 gap-6 mb-6">
                {/* Brand Selection */}
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
                    }}
                    className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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

                {/* Apply To Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Apply To
                  </label>
                  <div className="flex space-x-4">
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={bulkPrices.applyLevel === "model"}
                        onChange={() =>
                          handleBulkPriceChange("applyLevel", "model")
                        }
                      />
                      <span className="ml-2 text-gray-700">Entire Model</span>
                    </label>
                    <label className="inline-flex items-center">
                      <input
                        type="radio"
                        className="form-radio h-4 w-4 text-blue-600"
                        checked={bulkPrices.applyLevel === "year"}
                        onChange={() =>
                          handleBulkPriceChange("applyLevel", "year")
                        }
                      />
                      <span className="ml-2 text-gray-700">Specific Year</span>
                    </label>
                  </div>
                </div>

                {/* Model/Year Selection */}
                {selectedBrand && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {bulkPrices.applyLevel === "model" ? "Model" : "Year"}
                    </label>
                    {bulkPrices.applyLevel === "model" ? (
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        disabled={!selectedBrand || isLoading}
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
                    ) : (
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(e.target.value)}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        disabled={!selectedModel || isLoading}
                      >
                        <option value="">Select Year</option>
                        {selectedModel &&
                          brands
                            .find((b) => b.name === selectedBrand)
                            ?.models?.find((m) => m.name === selectedModel)
                            ?.years?.map((y) => (
                              <option key={y.range} value={y.range}>
                                {y.range}
                              </option>
                            ))}
                      </select>
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage 1 Price ({currencySymbols[currency]})
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {currencySymbols[currency]}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={
                        bulkPrices.stage1 || getBulkOverridePrice("Stage 1")
                      }
                      onChange={(e) =>
                        handleBulkPriceChange("stage1", e.target.value)
                      }
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Leave empty to keep original"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Stage 2 Price ({currencySymbols[currency]})
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">
                        {currencySymbols[currency]}
                      </span>
                    </div>
                    <input
                      type="number"
                      value={bulkPrices.stage2}
                      onChange={(e) =>
                        handleBulkPriceChange("stage2", e.target.value)
                      }
                      className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                      placeholder="Leave empty to keep original"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleBulkPriceSave}
                  disabled={
                    isLoading ||
                    !selectedBrand ||
                    (bulkPrices.applyLevel === "model" && !selectedModel) ||
                    (bulkPrices.applyLevel === "year" && !selectedYear)
                  }
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Apply Bulk Prices"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
        {activeTab === "aktplus" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                AKTPLUS Configuration
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and override default AKTPLUS option descriptions and prices
              </p>
            </div>
            <div className="px-6 py-5 space-y-8">
              {(aktPlusOverrides || []).map((item) => {
                const currentInput = aktPlusInputs[item.id] || {
                  title: item.title,
                  content: item.description || [],
                  price: item.price,
                };

                return (
                  <div key={item.id} className="space-y-3 border-b pb-4">
                    <div className="flex items-start gap-4">
                      {item.imageUrl && (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 object-contain rounded-md border"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-gray-700">
                          {item.title}
                        </h3>
                        {typeof item.price === "number" && (
                          <p className="text-sm text-green-600 font-medium">
                            Default Price: {item.price.toLocaleString()} SEK
                          </p>
                        )}
                        <div className="prose prose-sm text-gray-500">
                          {item.isOverride ? (
                            <p className="text-xs text-blue-500">
                              Custom override applied
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400">
                              Using default description
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="block text-sm font-medium text-gray-700">
                      Custom Price (SEK)
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={currentInput.price || ""}
                      onChange={(e) =>
                        setAktPlusInputs((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            price: parseFloat(e.target.value),
                          },
                        }))
                      }
                    />

                    <label className="block text-sm font-medium text-gray-700 mt-3">
                      Description Override
                    </label>
                    <textarea
                      value={currentInput.content
                        .map((b) => b.children?.map((c) => c.text).join(""))
                        .join("\n")}
                      onChange={(e) =>
                        setAktPlusInputs((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            title: item.title,
                            content: [
                              {
                                _type: "block",
                                children: [
                                  { _type: "span", text: e.target.value },
                                ],
                              },
                            ],
                          },
                        }))
                      }
                      rows={5}
                      className="w-full border border-gray-300 rounded-md p-3 text-sm"
                      placeholder="Write custom override..."
                    />

                    <button
                      onClick={async () => {
                        await fetch("/api/aktplus-overrides", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            aktPlusId: item.id,
                            title: currentInput.title,
                            description: currentInput.content,
                            price: currentInput.price,
                          }),
                        });

                        const res = await fetch("/api/aktplus-overrides");
                        const json = await res.json();
                        setAktPlusOverrides(json.aktplus || []);
                      }}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                    >
                      Save Override
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "generalInfo" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit General Info
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Customize the general info section for your reseller portal
              </p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                General Info Content{" "}
                {generalInfo.isOverride && "(Custom Override)"}
              </label>
              <textarea
                rows={8}
                value={
                  generalInfo.content
                    ?.map((b) => b.children?.map((c) => c.text).join("") || "")
                    .join("\n\n") || ""
                }
                onChange={(e) => {
                  setGeneralInfo({
                    ...generalInfo,
                    content: [
                      {
                        _type: "block",
                        style: "normal",
                        children: [{ _type: "span", text: e.target.value }],
                      },
                    ],
                  });
                }}
                className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
              <div className="mt-4 text-right">
                <button
                  onClick={async () => {
                    await fetch("/api/general-info", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ content: generalInfo.content }),
                    });
                    setSaveStatus({
                      message: "General Info saved",
                      isError: false,
                    });
                    setTimeout(
                      () => setSaveStatus({ message: "", isError: false }),
                      3000
                    );
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === "settings" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Account Settings
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage your currency and language preferences
              </p>
            </div>
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                    >
                      <option value="SEK">SEK (kr)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <div className="relative">
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                    >
                      <option value="sv">Swedish</option>
                      <option value="en">English</option>
                      <option value="de">Deutch</option>
                      <option value="da">Denmark</option>
                      <option value="no">Norway</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSettingsSave}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    "Save Settings"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "descriptions" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Edit Stage Descriptions
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Update reseller-specific tuning stage descriptions
              </p>
            </div>
            <div className="px-6 py-5 space-y-6">
              {stageDescriptions.map((desc, index) => (
                <div
                  key={desc.stageName}
                  className="border border-gray-100 rounded p-4"
                >
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {desc.stageName} {desc.isOverride && "(Custom Override)"}
                  </label>
                  <textarea
                    rows={5}
                    value={
                      desc.description
                        .map(
                          (block) =>
                            block.children?.map((c) => c.text).join("") || ""
                        )
                        .join("\n\n") || ""
                    }
                    onChange={(e) => {
                      const updated = [...stageDescriptions];
                      updated[index] = {
                        ...desc,
                        description: [
                          {
                            _type: "block",
                            style: "normal",
                            children: [{ _type: "span", text: e.target.value }],
                          },
                        ],
                      };
                      setStageDescriptions(updated);
                    }}
                    className="block w-full mt-1 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={async () => {
                        try {
                          const res = await fetch("/api/stage-descriptions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              stageName: desc.stageName,
                              description: desc.description,
                            }),
                          });

                          if (!res.ok) throw new Error("Save failed");

                          setSaveStatus({
                            message: `Saved ${desc.stageName} successfully!`,
                            isError: false,
                          });
                        } catch (err) {
                          console.error("Failed to save", err);
                          setSaveStatus({
                            message: "Failed to save description",
                            isError: true,
                          });
                        } finally {
                          setTimeout(
                            () =>
                              setSaveStatus({ message: "", isError: false }),
                            3000
                          );
                        }
                      }}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tuning Tab */}
        {activeTab === "tuning" && (
          <>
            {/* Vehicle Selection Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Vehicle Selection
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Select a vehicle to customize tuning stages
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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
                          className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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
                          className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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
                          className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
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
              </div>
            </div>

            {/* Tuning Stages */}
            {selectedStages.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Tuning Stages
                      </h2>
                      <p className="mt-1 text-sm text-gray-500">
                        Customize pricing and specifications for each stage
                      </p>
                    </div>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedBrand} {selectedModel} {selectedYear}{" "}
                      {selectedEngine}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {selectedStages.map((stage) => {
                      const override = findOverride(
                        selectedBrand,
                        selectedModel,
                        selectedYear,
                        selectedEngine,
                        stage.name
                      );

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
                          className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                        >
                          <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-lg text-gray-900">
                                {stage.name}
                              </h3>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Stage {stage.name.replace(/\D/g, "")}
                              </span>
                            </div>
                          </div>
                          <div className="p-4">
                            {/* Original Specs */}
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Original Specifications
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">HP</p>
                                  <p className="font-medium">
                                    {stage.origHk} HK
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-3 rounded">
                                  <p className="text-xs text-gray-500">
                                    Torque
                                  </p>
                                  <p className="font-medium">
                                    {stage.origNm} NM
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Base Configuration */}
                            <div className="mb-4">
                              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                Base Configuration
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-gray-50 p-2 rounded text-center">
                                  <p className="text-xs text-gray-500">Price</p>
                                  <p className="font-medium text-sm">
                                    {stage.price} SEK
                                    {currency !== "SEK" && (
                                      <span className="block text-xs text-gray-500">
                                        ≈{" "}
                                        {convertCurrency(stage.price, currency)}{" "}
                                        {currencySymbols[currency]}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-center">
                                  <p className="text-xs text-gray-500">HP</p>
                                  <p className="font-medium text-sm">
                                    {stage.tunedHk} HK
                                  </p>
                                </div>
                                <div className="bg-gray-50 p-2 rounded text-center">
                                  <p className="text-xs text-gray-500">
                                    Torque
                                  </p>
                                  <p className="font-medium text-sm">
                                    {stage.tunedNm} NM
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Custom Configuration */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Custom Price ({currencySymbols[currency]})
                                </label>
                                <div className="relative rounded-md shadow-sm">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <span className="text-gray-500 sm:text-sm">
                                      {currencySymbols[currency]}
                                    </span>
                                  </div>
                                  <input
                                    value={price}
                                    onChange={(e) =>
                                      handleInputChange(
                                        stage.name,
                                        "price",
                                        e.target.value
                                      )
                                    }
                                    type="number"
                                    className="focus:ring-blue-500 focus:border-blue-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Custom Horsepower (HK)
                                </label>
                                <input
                                  value={hk}
                                  onChange={(e) =>
                                    handleInputChange(
                                      stage.name,
                                      "hk",
                                      e.target.value
                                    )
                                  }
                                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                  type="number"
                                />
                              </div>

                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Custom Torque (NM)
                                </label>
                                <input
                                  value={nm}
                                  onChange={(e) =>
                                    handleInputChange(
                                      stage.name,
                                      "nm",
                                      e.target.value
                                    )
                                  }
                                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                  type="number"
                                />
                              </div>
                            </div>

                            <button
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
                                  Number(nm)
                                )
                              }
                              disabled={isLoading}
                              className="mt-4 w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                              {isLoading ? (
                                <>
                                  <svg
                                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      className="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      strokeWidth="4"
                                    ></circle>
                                    <path
                                      className="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    ></path>
                                  </svg>
                                  Saving...
                                </>
                              ) : (
                                "Save Customization"
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
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

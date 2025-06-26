import { useEffect, useState } from "react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../api/auth/[...nextauth]";
import { signOut } from "next-auth/react";
import { urlFor } from "@/lib/sanity";

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
  const [enableLanguageSwitcher, setEnableLanguageSwitcher] = useState(false);
  const [secondaryLanguage, setSecondaryLanguage] = useState("");

  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // New state for General tab
  const [bulkPrices, setBulkPrices] = useState({
    steg1: "",
    steg2: "",
    steg3: "",
    steg4: "",
    dsg: "",
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
          `/api/reseller-config?resellerId=${session.user.resellerId}`,
        );
        const json = await res.json();
        if (json.currency) setCurrency(json.currency);
        if (json.language) setLanguage(json.language);
        if (json.subscription) setSubscription(json.subscription);
        if (json.logo?.asset?.url) setLogoPreview(json.logo.asset.url);
        if (json.enableLanguageSwitcher)
          setEnableLanguageSwitcher(json.enableLanguageSwitcher);
        if (json.secondaryLanguage)
          setSecondaryLanguage(json.secondaryLanguage);
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
        body: JSON.stringify({
          currency,
          language,
          subscription,
          enableLanguageSwitcher,
          secondaryLanguage,
        }),
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

  const [aktPlusLogoFile, setAktPlusLogoFile] = useState(null);
  const [aktPlusLogoPreview, setAktPlusLogoPreview] = useState("");

  useEffect(() => {
    if (session?.user?.resellerId) {
      fetch(`/api/reseller-config?resellerId=${session.user.resellerId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.aktPlusLogo) {
            setAktPlusLogoPreview(urlFor(json.aktPlusLogo).url());
          }
        });
    }
  }, [session]);
  const handleAktPlusLogoUpload = async () => {
    if (!aktPlusLogoFile) return;

    try {
      const reader = new FileReader();
      reader.readAsDataURL(aktPlusLogoFile);
      reader.onload = async () => {
        const base64Data = reader.result?.toString().split(",")[1] || "";

        const response = await fetch("/api/update-aktplus-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageData: base64Data,
            contentType: aktPlusLogoFile.type,
          }),
        });

        if (!response.ok) throw new Error("AKTPLUS logo upload failed");

        const { aktPlusLogoUrl } = await response.json();
        setAktPlusLogoPreview(aktPlusLogoUrl);
        setSaveStatus({
          message: "AKTPLUS logo updated successfully!",
          isError: false,
        });
      };
      reader.onerror = () => {
        throw new Error("File reading failed");
      };
    } catch (error) {
      console.error("Error uploading AKTPLUS logo:", error);
      setSaveStatus({
        message: "Failed to update AKTPLUS logo",
        isError: true,
      });
    } finally {
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
    }
  };

  const [displaySettings, setDisplaySettings] = useState({
    showAktPlus: true,
    showBrandLogo: true,
    showStageLogo: true,
    showDynoChart: true,
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);

  // Add this useEffect to load the current logo
  useEffect(() => {
    if (session?.user?.resellerId) {
      fetch(`/api/reseller-config?resellerId=${session.user.resellerId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.logo?.asset?.url) {
            setLogoPreview(json.logo.asset.url);
          }
        });
    }
  }, [session]);

  const sortedStageDescriptions = [...stageDescriptions].sort((a, b) => {
    const order = ["Steg 1", "Steg 2", "Steg 3", "Steg 4", "DSG"];
    return order.indexOf(a.stageName) - order.indexOf(b.stageName);
  });

  const [subscription, setSubscription] = useState(null);

  // Add this function to handle logo upload
  const handleLogoUpload = async () => {
    if (!logoFile) return;

    try {
      setLogoLoading(true);
      const reader = new FileReader();
      reader.readAsDataURL(logoFile);
      reader.onload = async () => {
        const base64Data = reader.result?.toString().split(",")[1] || "";

        const response = await fetch("/api/update-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: base64Data }),
        });

        if (!response.ok) throw new Error("Logo upload failed");

        const { logoUrl } = await response.json();
        setLogoPreview(logoUrl);
        setLogoLoading(false);
        setSaveStatus({
          message: "Logo updated successfully!",
          isError: false,
        });
      };
      reader.onerror = () => {
        setLogoLoading(false);
        throw new Error("File reading failed");
      };
    } catch (error) {
      console.error("Error uploading logo:", error);
      setLogoLoading(false);
      setSaveStatus({
        message: "Failed to update logo",
        isError: true,
      });
    } finally {
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
    }
  };

  const handlePasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords don't match");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("/api/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Password update failed");
      }

      setPasswordSuccess("Password changed successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
    } catch (error) {
      setPasswordError(error.message);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setPasswordSuccess("");
        setPasswordError("");
      }, 3000);
    }
  };

  // Updated handleBulkPriceSave function
  const handleBulkPriceSave = async (isPreview = false, applyLevel) => {
    if (
      !selectedBrand ||
      !selectedModel ||
      (applyLevel === "year" && !selectedYear)
    ) {
      setSaveStatus({
        message: "Please select all required fields",
        isError: true,
      });
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
      return;
    }

    try {
      if (isPreview) {
        setIsPreviewLoading(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch("/api/bulk-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: selectedBrand,
          model: selectedModel,
          year: applyLevel === "year" ? selectedYear : undefined,
          applyLevel,
          stage1Price: bulkPrices.steg1 ? Number(bulkPrices.steg1) : undefined,
          stage2Price: bulkPrices.steg2 ? Number(bulkPrices.steg2) : undefined,
          stage3Price: bulkPrices.steg3 ? Number(bulkPrices.steg3) : undefined,
          stage4Price: bulkPrices.steg4 ? Number(bulkPrices.steg4) : undefined,
          dsgPrice: bulkPrices.dsg ? Number(bulkPrices.dsg) : undefined,
          preview: isPreview,
        }),
      });

      if (!response.ok) throw new Error("Failed to process bulk prices");

      const result = await response.json();

      if (isPreview) {
        setPreviewData(result);
        setShowPreview(true);
        setIsPreviewLoading(false);
        return;
      }

      // Refresh data after actual save
      const refreshed = await fetch("/api/brands-with-overrides");
      const { brands: refreshedBrands, overrides: refreshedOverrides } =
        await refreshed.json();
      setBrands(refreshedBrands);
      setOverrides(refreshedOverrides);

      setSaveStatus({
        message: "Bulk prices saved successfully!",
        isError: false,
      });

      // Clear preview after successful save
      setPreviewData(null);
      setShowPreview(false);
    } catch (error) {
      console.error("Failed to process bulk prices:", error);
      setSaveStatus({
        message: isPreview
          ? "Error generating preview"
          : "Error saving bulk prices",
        isError: true,
      });
    } finally {
      if (isPreview) {
        setIsPreviewLoading(false);
      } else {
        setIsLoading(false);
      }
      setTimeout(() => setSaveStatus({ message: "", isError: false }), 3000);
    }
  };

  const [resellerContactInfo, setResellerContactInfo] = useState("");

  useEffect(() => {
    if (session?.user?.resellerId) {
      fetch(`/api/reseller-config?resellerId=${session.user.resellerId}`)
        .then((res) => res.json())
        .then((json) => {
          if (json.contactInfo) {
            setResellerContactInfo(json.contactInfo);
          }
        });
    }
  }, [session]);

  const saveContactInfo = async () => {
    try {
      const response = await fetch("/api/update-reseller-contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactInfo: resellerContactInfo,
        }),
      });

      if (!response.ok) throw new Error("Failed to save contact info");

      setSaveStatus({
        message: "Contact info saved successfully!",
        isError: false,
      });
    } catch (error) {
      setSaveStatus({
        message: "Failed to save contact info",
        isError: true,
      });
    } finally {
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
      steg1: "",
      steg2: "",
      steg3: "",
      steg4: "",
      dsg: "",
    }));
  }, [selectedBrand, selectedModel, selectedYear, bulkPrices.applyLevel]);

  const handleBulkPriceChange = (field, value) => {
    const sekValue = value ? fromCurrency(parseFloat(value), currency) : "";
    setBulkPrices((prev) => ({
      ...prev,
      [field]: sekValue,
    }));
  };

  const conversionRates: Record<string, number> = {
    SEK: 1,
    EUR: 0.1,
    USD: 0.095,
    GBP: 0.085,
    NOK: 0.98,
    DKK: 0.72,
    CHF: 0.09,
    PLN: 0.39,
    CZK: 2.3,
    HUF: 34.0,
    JPY: 14.2,
    CNY: 0.66,
    RUB: 8.5,
    TRY: 2.85,
    AED: 0.35,
    THB: 3.45,
    AUD: 0.14,
    CAD: 0.13,
    INR: 7.8,
    SGD: 0.13,
    NZD: 0.15,
    ZAR: 1.7,
    BRL: 0.5,
    MXN: 1.8,
  };

  // Funktion för att konvertera SEK → Valuta
  const toCurrency = (sek: number, currency: string): number => {
    const rate = conversionRates[currency] || 1;
    return Math.round(sek * rate);
  };

  // Funktion för att konvertera Valuta → SEK
  const fromCurrency = (val: number, currency: string): number => {
    const rate = conversionRates[currency] || 1;
    return Math.round(val / rate);
  };

  const currencySymbols = {
    SEK: "kr",
    EUR: "€",
    USD: "$",
    GBP: "£",
    NOK: "kr",
    DKK: "kr",
    CHF: "CHF",
    PLN: "zł",
    CZK: "Kč",
    HUF: "Ft",
    JPY: "¥",
    CNY: "¥",
    RUB: "₽",
    TRY: "₺",
    AED: "د.إ",
    THB: "฿",
    AUD: "A$",
    CAD: "C$",
    INR: "₹",
    SGD: "S$",
    NZD: "NZ$",
    ZAR: "R",
    BRL: "R$",
    MXN: "MX$",
  };

  const convertCurrency = (price: number, currency: string) => {
    const rates = {
      EUR: 0.1,
      USD: 0.1,
      GBP: 0.08,
      SEK: 1,
      THB: 3.5,
      JPY: 14.0,
      CNY: 0.68,
      RUB: 8.5,
      TRY: 3.1,
      PLN: 0.42,
      CZK: 2.3,
      HUF: 35.0,
      AED: 0.35,
      KRW: 125.0,
      NOK: 1.0,
      DKK: 0.7,
      CHF: 0.085,
      AUD: 0.14,
      CAD: 0.13,
      INR: 7.8,
      SGD: 0.13,
      NZD: 0.15,
      ZAR: 1.7,
      BRL: 0.5,
      MXN: 1.8,
    };
    return Math.round(price * (rates[currency] || 1));
  };

  const getBulkOverridePrice = (stageName) => {
    const match = overrides.find(
      (o) =>
        o.brand === selectedBrand &&
        (bulkPrices.applyLevel === "model"
          ? o.model === selectedModel
          : o.year === selectedYear) &&
        o.stageName === stageName &&
        !o.engine,
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
    (d) => d.stageName === selectedStages[0]?.name,
  );

  const [generalInfo, setGeneralInfo] = useState({
    content: [],
    isOverride: false,
  });

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Header */}
      <header className="bg-gradient-to-r from-red-800 to-red-600 text-white shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-white p-2 rounded-lg shadow-md">
                <svg
                  className="w-8 h-8 text-red-600"
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
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                  API Tuning Dashboard
                </h1>
                <p className="text-red-100 text-sm">ULTIMATE API ALL IN ONE!</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-2 bg-red-700/50 px-3 py-1 rounded-full">
                <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-sm">
                  {session.user.name || session.user.email}
                </span>
              </div>
              <button
                onClick={() => signOut()}
                className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-md transition-colors duration-200"
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
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 w-full">
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
        <div className="mb-6 border-b border-gray-300">
          <nav className="-mb-px flex overflow-x-auto pb-2 space-x-4 sm:space-x-8 scrollbar-hide">
            <button
              onClick={() => setActiveTab("tuning")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "tuning"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              🛠️ Tuning Config
            </button>
            <button
              onClick={() => setActiveTab("general")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "general"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              💰 Overall Pricing
            </button>
            <button
              onClick={() => setActiveTab("descriptions")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "descriptions"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              🧾 Stage Descriptions
            </button>
            <button
              onClick={() => setActiveTab("aktplus")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "aktplus"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              🧩 AKT+ Options
            </button>
            <button
              onClick={() => setActiveTab("contact")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "contact"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              📇 Contact Config
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`whitespace-nowrap py-3 px-3 border-b-2 font-semibold text-sm transition-colors duration-200 ${
                activeTab === "settings"
                  ? "border-red-500 text-red-600"
                  : "border-transparent text-gray-500 hover:text-red-500 hover:border-red-300"
              }`}
            >
              ⚙️ Settings & Display
            </button>
          </nav>
        </div>

        {/* General Tab */}
        {activeTab === "general" && (
          <div className="space-y-8">
            {/* Option 1: Make - Model */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
                <h2 className="text-lg font-semibold text-gray-900">
                  Bulk Pricing by Model
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Apply standard pricing to all vehicles of a specific model
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
                        setPreviewData(null);
                      }}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border"
                      disabled={isLoading || isPreviewLoading}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selection */}
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
                          setPreviewData(null);
                        }}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border"
                        disabled={
                          !selectedBrand || isLoading || isPreviewLoading
                        }
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
                </div>

                {/* Price Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["steg1", "steg2", "steg3", "steg4", "dsg"].map((stage) => (
                    <div key={stage}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {stage.replace("steg", "Stage ").toUpperCase()} Price (
                        {currencySymbols[currency]})
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
                            bulkPrices[stage] !== null &&
                            bulkPrices[stage] !== ""
                              ? toCurrency(Number(bulkPrices[stage]), currency)
                              : ""
                          }
                          onChange={(e) => {
                            handleBulkPriceChange(stage, e.target.value);
                            setPreviewData(null);
                          }}
                          className="focus:ring-red-500 focus:border-red-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                          placeholder="Leave empty to keep original"
                          disabled={isLoading || isPreviewLoading}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview and Save Buttons */}
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => handleBulkPriceSave(true, "model")}
                    disabled={
                      isLoading ||
                      isPreviewLoading ||
                      !selectedBrand ||
                      !selectedModel
                    }
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
                  >
                    {isPreviewLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
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
                        Generating Preview...
                      </>
                    ) : (
                      "Preview Changes"
                    )}
                  </button>

                  <button
                    onClick={() => handleBulkPriceSave(false, "model")}
                    disabled={
                      isLoading ||
                      isPreviewLoading ||
                      (previewData && !showPreview) ||
                      !selectedBrand ||
                      !selectedModel
                    }
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed"
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
                      "Apply to Model"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Option 2: Make - Model - Year */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
                <h2 className="text-lg font-semibold text-gray-900">
                  Bulk Pricing by Year
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Apply standard pricing to all vehicles of a specific model
                  year
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
                        setPreviewData(null);
                      }}
                      className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border"
                      disabled={isLoading || isPreviewLoading}
                    >
                      <option value="">Select Brand</option>
                      {brands.map((b) => (
                        <option key={b.name} value={b.name}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Model Selection */}
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
                          setPreviewData(null);
                        }}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border"
                        disabled={
                          !selectedBrand || isLoading || isPreviewLoading
                        }
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

                  {/* Year Selection */}
                  {selectedModel && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Year
                      </label>
                      <select
                        value={selectedYear}
                        onChange={(e) => {
                          setSelectedYear(e.target.value);
                          setPreviewData(null);
                        }}
                        className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-red-500 focus:border-red-500 sm:text-sm rounded-md border"
                        disabled={isLoading || isPreviewLoading}
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
                </div>

                {/* Price Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {["steg1", "steg2", "steg3", "steg4", "dsg"].map((stage) => (
                    <div key={stage}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {stage.replace("steg", "Stage ").toUpperCase()} Price (
                        {currencySymbols[currency]})
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
                            bulkPrices[stage] !== null &&
                            bulkPrices[stage] !== ""
                              ? toCurrency(Number(bulkPrices[stage]), currency)
                              : ""
                          }
                          onChange={(e) => {
                            handleBulkPriceChange(stage, e.target.value);
                            setPreviewData(null);
                          }}
                          className="focus:ring-red-500 focus:border-red-500 block w-full pl-12 sm:text-sm border-gray-300 rounded-md p-2 border"
                          placeholder="Leave empty to keep original"
                          disabled={isLoading || isPreviewLoading}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview and Save Buttons */}
                <div className="mt-6 flex space-x-4">
                  <button
                    onClick={() => handleBulkPriceSave(true, "year")}
                    disabled={
                      isLoading ||
                      isPreviewLoading ||
                      !selectedBrand ||
                      !selectedModel ||
                      !selectedYear
                    }
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70"
                  >
                    {isPreviewLoading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
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
                        Generating Preview...
                      </>
                    ) : (
                      "Preview Changes"
                    )}
                  </button>

                  <button
                    onClick={() => handleBulkPriceSave(false, "year")}
                    disabled={
                      isLoading ||
                      isPreviewLoading ||
                      (previewData && !showPreview) ||
                      !selectedBrand ||
                      !selectedModel ||
                      !selectedYear
                    }
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-70 disabled:cursor-not-allowed"
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
                      "Apply to Year"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Preview Section (shared between both options) */}
            {previewData && (
              <div className="mt-6 bg-white rounded-lg shadow overflow-hidden border border-gray-200">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full px-4 py-3 bg-gray-50 text-left font-medium text-gray-900 hover:bg-gray-100 flex justify-between items-center"
                >
                  <div className="flex items-center">
                    <span className="mr-2">Preview Changes</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {previewData.count} items will be updated
                    </span>
                  </div>
                  <svg
                    className={`h-5 w-5 text-gray-400 transform transition-transform ${
                      showPreview ? "rotate-180" : ""
                    }`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {showPreview && (
                  <div className="border-t border-gray-200 p-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Model
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Year
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Engine
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Stage
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current Price
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              New Price
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {previewData.items.map((item, index) => (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {item.model}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {item.year}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {item.engine}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {item.stageName.replace("Steg", "Stage")}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                                {item.currentPrice !== null ? (
                                  <>
                                    {toCurrency(item.currentPriceSEK, currency)}{" "}
                                    {currencySymbols[currency]}
                                    <div className="text-xs text-gray-400">
                                      ({item.currentPriceSEK} SEK)
                                    </div>
                                  </>
                                ) : (
                                  "N/A"
                                )}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-green-600">
                                {toCurrency(item.priceSEK, currency)}{" "}
                                {currencySymbols[currency]}
                                <div className="text-xs text-gray-400">
                                  ({item.priceSEK} SEK)
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "contact" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Contact Information Configuration
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Configure your contact details that will be shown to customers
              </p>
            </div>
            <div className="px-6 py-5 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Numbers (One per line)
                </label>
                <textarea
                  rows={6}
                  className="w-full border border-gray-300 rounded-md p-3 text-sm"
                  placeholder={`Example:\nGöteborg: 031-123456\nStockholm: 08-123456`}
                  value={resellerContactInfo}
                  onChange={(e) => setResellerContactInfo(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={saveContactInfo}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 transition"
                >
                  Save Contact Info
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "aktplus" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-red-50 to-white">
              <h2 className="text-lg font-semibold text-gray-900">
                AKTPLUS Configuration
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                View and override default AKTPLUS option descriptions and prices
              </p>
            </div>

            <div className="px-6 py-5 space-y-8">
              {/* 🔴 AKTPLUS LOGO UPLOADER — Global logo for reseller */}
              <div>
                <h3 className="text-md font-medium text-gray-900 mb-2">
                  AKTPLUS Logo
                </h3>
                <div className="flex items-center gap-4">
                  {aktPlusLogoPreview ? (
                    <img
                      src={aktPlusLogoPreview}
                      alt="AKT+ Logo"
                      className="h-8 w-auto object-contain"
                    />
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded-md border">
                      <span className="text-xs text-gray-400">No logo</span>
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAktPlusLogoFile(file);
                          setAktPlusLogoPreview(URL.createObjectURL(file));
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
                    />
                    <button
                      onClick={handleAktPlusLogoUpload}
                      disabled={!aktPlusLogoFile}
                      className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Update AKTPLUS Logo
                    </button>
                  </div>
                </div>
              </div>

              {/* 🔵 LOOP OVER OPTIONS BELOW */}
              {(aktPlusOverrides || []).map((item) => {
                const conversionRates = {
                  SEK: 1,
                  EUR: 0.1, // 1 SEK = 0.10 EUR (⇒ 1 EUR ≈ 10 SEK)
                  USD: 0.095, // 1 USD ≈ 10.5 SEK
                  GBP: 0.085, // 1 GBP ≈ 11.8 SEK
                  NOK: 0.98,
                  DKK: 0.72,
                  CHF: 0.09,
                  PLN: 0.39,
                  CZK: 2.3,
                  HUF: 34.0,
                  JPY: 14.2,
                  CNY: 0.66,
                  RUB: 8.5,
                  TRY: 2.85,
                  AED: 0.35,
                  THB: 3.45,
                  AUD: 0.14,
                  CAD: 0.13,
                  INR: 7.8,
                  SGD: 0.13,
                  NZD: 0.15,
                  ZAR: 1.7,
                  BRL: 0.5,
                  MXN: 1.8,
                };

                const currentInput = {
                  title: aktPlusInputs[item.id]?.title ?? item.title,
                  content:
                    aktPlusInputs[item.id]?.content ?? (item.description || []),
                  price:
                    aktPlusInputs[item.id]?.price ??
                    Math.round(
                      (item.price ?? 0) * (conversionRates[currency] || 1),
                    ),
                };

                return (
                  <div
                    key={item.id}
                    className="space-y-3 border-b pb-4 last:border-b-0"
                  >
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
                            Price:{" "}
                            {new Intl.NumberFormat(
                              currency === "SEK" ? "sv-SE" : "en-US",
                              {
                                style: "currency",
                                currency: currency,
                                maximumFractionDigits: 0,
                              },
                            ).format(convertCurrency(item.price, currency))}
                          </p>
                        )}
                        <div className="prose prose-sm text-gray-500">
                          {item.isOverride ? (
                            <p className="text-xs text-red-500">
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
                      Custom Price ({currencySymbols[currency]})
                    </label>
                    <input
                      type="number"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={
                        aktPlusInputs[item.id]?.price !== undefined
                          ? toCurrency(aktPlusInputs[item.id].price, currency)
                          : toCurrency(item.price ?? 0, currency)
                      }
                      onChange={(e) => {
                        const inputCurrencyValue = parseFloat(e.target.value);
                        const sekValue = isNaN(inputCurrencyValue)
                          ? 0
                          : fromCurrency(inputCurrencyValue, currency);

                        setAktPlusInputs((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            price: sekValue,
                          },
                        }));
                      }}
                    />
                    {aktPlusInputs[item.id]?.price && (
                      <small className="text-gray-500 block mt-1">
                        ≈{" "}
                        {Number(aktPlusInputs[item.id].price).toLocaleString(
                          "sv-SE",
                        )}{" "}
                        SEK
                      </small>
                    )}

                    <label className="block text-sm font-medium text-gray-700 mt-3">
                      Custom Title ({language.toUpperCase()})
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded-md p-2 text-sm"
                      value={aktPlusInputs[item.id]?.title ?? item.title}
                      onChange={(e) =>
                        setAktPlusInputs((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            title: e.target.value,
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

                    <label className="block text-sm font-medium text-gray-700 mt-3">
                      Custom Image (optional)
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAktPlusInputs((prev) => ({
                            ...prev,
                            [item.id]: {
                              ...prev[item.id],
                              imageFile: file,
                            },
                          }));
                        }
                      }}
                      className="text-sm"
                    />

                    {/* Save Button */}
                    <button
                      onClick={async () => {
                        try {
                          const parsedPrice = parseFloat(currentInput.price);
                          const priceInSek = isNaN(parsedPrice)
                            ? 0
                            : Math.round(
                                parsedPrice / (conversionRates[currency] || 1),
                              );

                          let assetId = null;

                          // 👇 Upload image if set
                          if (aktPlusInputs[item.id]?.imageFile) {
                            const file = aktPlusInputs[item.id].imageFile;
                            const reader = new FileReader();

                            const base64 = await new Promise(
                              (resolve, reject) => {
                                reader.onload = () =>
                                  resolve(
                                    reader.result?.toString().split(",")[1],
                                  );
                                reader.onerror = reject;
                                reader.readAsDataURL(file);
                              },
                            );

                            const uploadRes = await fetch(
                              "/api/upload-aktplus-option-image",
                              {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                  imageData: base64,
                                  contentType: file.type,
                                }),
                              },
                            );

                            const uploadJson = await uploadRes.json();
                            assetId = uploadJson.assetId; // ✅ get _id not url
                          }

                          // 👇 Save the override (send assetId instead of imageUrl)
                          await fetch("/api/aktplus-overrides", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              aktPlusId: item.id,
                              title: currentInput.title,
                              description: currentInput.content,
                              price: priceInSek,
                              assetId, // ✅ backend expects this now
                            }),
                          });

                          const res = await fetch("/api/aktplus-overrides");
                          const json = await res.json();
                          setAktPlusOverrides(json.aktplus || []);

                          setSaveStatus({
                            message: `AKTPLUS override saved (${currencySymbols[currency]}).`,
                            isError: false,
                          });

                          setTimeout(() => {
                            setSaveStatus({ message: "", isError: false });
                          }, 3000);
                        } catch (error) {
                          console.error(
                            "Failed to save AKTPLUS override",
                            error,
                          );
                          setSaveStatus({
                            message: "Failed to save AKTPLUS override.",
                            isError: true,
                          });
                        }
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

        {/* Combined Descriptions and General Info Tab */}
        {activeTab === "descriptions" && (
          <div className="space-y-8">
            {/* Stage Descriptions Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Edit Stage Descriptions
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Update reseller-specific tuning stage descriptions
                </p>
              </div>
              <div className="px-6 py-5 space-y-6">
                {sortedStageDescriptions.map((desc, index) => (
                  <div
                    key={desc.stageName}
                    className="border border-gray-100 rounded p-4"
                  >
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {desc.stageName.replace("Steg", "Stage")}{" "}
                      {desc.isOverride}
                    </label>
                    <textarea
                      rows={5}
                      value={
                        desc.description
                          .map(
                            (block) =>
                              block.children?.map((c) => c.text).join("") || "",
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
                              children: [
                                { _type: "span", text: e.target.value },
                              ],
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
                              3000,
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

            {/* General Info Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
                  General Info Content {generalInfo.isOverride}
                </label>
                <textarea
                  rows={8}
                  value={
                    generalInfo.content
                      ?.map(
                        (b) => b.children?.map((c) => c.text).join("") || "",
                      )
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
                        3000,
                      );
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Combined Settings and Display Tab */}
        {activeTab === "settings" && (
          <div className="space-y-8">
            {/* Account Settings Section */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Account Settings
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Manage your currency, language, logo, and password
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
                        <option value="THB">THB (฿)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CNY">CNY (¥)</option>
                        <option value="RUB">RUB (₽)</option>
                        <option value="TRY">TRY (₺)</option>
                        <option value="PLN">PLN (zł)</option>
                        <option value="CZK">CZK (Kč)</option>
                        <option value="HUF">HUF (Ft)</option>
                        <option value="AED">AED (د.إ)</option>
                        <option value="KRW">KRW (W)</option>
                        <option value="NOK">NOK (kr)</option>
                        <option value="DKK">DKK (kr)</option>
                        <option value="CHF">CHF (CHF)</option>
                        <option value="AUD">AUD (A$)</option>
                        <option value="CAD">CAD (C$)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="SGD">SGD (S$)</option>
                        <option value="NZD">NZD (NZ$)</option>
                        <option value="ZAR">ZAR (R)</option>
                        <option value="BRL">BRL (R$)</option>
                        <option value="MXN">MXN (MX$)</option>
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
                        <option value="sv">🇸🇪 Swedish</option>
                        <option value="en">🇬🇧 English</option>
                        <option value="de">🇩🇪 German</option>
                        <option value="fr">🇫🇷 French</option>
                        <option value="nl">🇳🇱 Dutch</option>
                        <option value="da">🇩🇰 Danish</option>
                        <option value="no">🇳🇴 Norwegian</option>
                        <option value="ar">🇸🇦 Arabic</option>
                        <option value="fi">🇫🇮 Finnish</option>
                        <option value="es">🇪🇸 Spanish</option>
                        <option value="it">🇮🇹 Italian</option>
                        <option value="pt">🇵🇹 Portuguese</option>
                        <option value="ru">🇷🇺 Russian</option>
                        <option value="zh">🇨🇳 Chinese</option>
                        <option value="ja">🇯🇵 Japanese</option>
                        <option value="ko">🇰🇷 Korean</option>
                        <option value="pl">🇵🇱 Polish</option>
                        <option value="tr">🇹🇷 Turkish</option>
                        <option value="hu">🇭🇺 Hungarian</option>
                        <option value="cs">🇨🇿 Czech</option>
                        <option value="uk">🇺🇦 Ukrainian</option>
                        <option value="ro">🇷🇴 Romanian</option>
                      </select>
                    </div>
                  </div>
                </div>
                {/* Language Switcher Settings */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Language Switcher Configuration
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Configure language switcher options for your customers
                    </p>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          Enable Language Switcher
                        </h3>
                        <p className="text-sm text-gray-500">
                          Allow customers to switch between languages
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableLanguageSwitcher}
                          onChange={() =>
                            setEnableLanguageSwitcher(!enableLanguageSwitcher)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {enableLanguageSwitcher && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Secondary Language
                        </label>
                        <select
                          value={secondaryLanguage}
                          onChange={(e) => setSecondaryLanguage(e.target.value)}
                          className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                        >
                          <option value="">Select Secondary Language</option>
                          <option value="sv">🇸🇪 Swedish</option>
                          <option value="en">🇬🇧 English</option>
                          <option value="de">🇩🇪 German</option>
                          <option value="fr">🇫🇷 French</option>
                          <option value="nl">🇳🇱 Dutch</option>
                          <option value="da">🇩🇰 Danish</option>
                          <option value="no">🇳🇴 Norwegian</option>
                          <option value="ar">🇸🇦 Arabic</option>
                          <option value="fi">🇫🇮 Finnish</option>
                          <option value="es">🇪🇸 Spanish</option>
                          <option value="it">🇮🇹 Italian</option>
                          <option value="pt">🇵🇹 Portuguese</option>
                          <option value="ru">🇷🇺 Russian</option>
                          <option value="zh">🇨🇳 Chinese</option>
                          <option value="ja">🇯🇵 Japanese</option>
                          <option value="ko">🇰🇷 Korean</option>
                          <option value="pl">🇵🇱 Polish</option>
                          <option value="tr">🇹🇷 Turkish</option>
                          <option value="hu">🇭🇺 Hungarian</option>
                          <option value="cs">🇨🇿 Czech</option>
                          <option value="uk">🇺🇦 Ukrainian</option>
                          <option value="th">🇹🇭 ไทย (Thai)</option>
                          <option value="ro">🇷🇴 Romanian</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                {/* Logo Upload Section */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Company Logo
                  </h3>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <img
                        src={logoPreview}
                        alt="Current logo"
                        className="w-16 h-16 object-contain rounded-md border"
                      />
                    )}
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setLogoFile(file);
                            setLogoPreview(URL.createObjectURL(file));
                          }
                        }}
                        className="block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                      />
                      <button
                        onClick={handleLogoUpload}
                        disabled={!logoFile || logoLoading}
                        className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {logoLoading ? (
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
                            Uploading...
                          </>
                        ) : (
                          "Update Logo"
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Display Settings Section */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-5 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Display Settings Configuration
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Control which elements are visible to your customers
                    </p>
                  </div>
                  <div className="px-6 py-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            AKTPLUS Options
                          </h3>
                          <p className="text-sm text-gray-500">
                            Show or hide the additional options section
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.showAktPlus}
                            onChange={() =>
                              setDisplaySettings((prev) => ({
                                ...prev,
                                showAktPlus: !prev.showAktPlus,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Brand Logo
                          </h3>
                          <p className="text-sm text-gray-500">
                            Show or hide the brand logo in the tuning stages
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.showBrandLogo}
                            onChange={() =>
                              setDisplaySettings((prev) => ({
                                ...prev,
                                showBrandLogo: !prev.showBrandLogo,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Stage Badges
                          </h3>
                          <p className="text-sm text-gray-500">
                            Show or hide the stage badges (Steg 1, Steg 2, etc.)
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.showStageLogo}
                            onChange={() =>
                              setDisplaySettings((prev) => ({
                                ...prev,
                                showStageLogo: !prev.showStageLogo,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            Dyno Charts
                          </h3>
                          <p className="text-sm text-gray-500">
                            Show or hide the dyno performance charts
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={displaySettings.showDynoChart}
                            onChange={() =>
                              setDisplaySettings((prev) => ({
                                ...prev,
                                showDynoChart: !prev.showDynoChart,
                              }))
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <button
                        onClick={async () => {
                          try {
                            setIsLoading(true);
                            await fetch("/api/update-display-settings", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(displaySettings),
                            });
                            setSaveStatus({
                              message: "Display settings saved successfully!",
                              isError: false,
                            });
                          } catch (err) {
                            console.error(
                              "Error updating display settings",
                              err,
                            );
                            setSaveStatus({
                              message: "Failed to save settings.",
                              isError: true,
                            });
                          } finally {
                            setIsLoading(false);
                            setTimeout(
                              () =>
                                setSaveStatus({ message: "", isError: false }),
                              3000,
                            );
                          }
                        }}
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
                          "Save Display Settings"
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Password Change Section */}
                <div className="mt-8 border-t pt-6">
                  <h3 className="text-md font-medium text-gray-900 mb-4">
                    Change Password
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="block w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                    </div>
                    {passwordError && (
                      <div className="text-red-500 text-sm">
                        {passwordError}
                      </div>
                    )}
                    {passwordSuccess && (
                      <div className="text-green-500 text-sm">
                        {passwordSuccess}
                      </div>
                    )}
                    <button
                      onClick={handlePasswordChange}
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
                          Changing...
                        </>
                      ) : (
                        "Change Password"
                      )}
                    </button>
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
                      "Save All Settings"
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="px-6 py-5 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Subscription Plan
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Your current subscription details
                </p>
              </div>
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plan Type
                    </label>
                    <div className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded-md">
                      {subscription?.planType === "month"
                        ? "Monthly"
                        : "Yearly"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
                    <div className="mt-1 text-sm text-gray-900 p-2 bg-gray-50 rounded-md">
                      {subscription
                        ? `${subscription.price} ${subscription.currency}`
                        : "Not set"}
                    </div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-gray-500">
                  Contact support if you need to change your subscription plan.
                </div>
              </div>
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {selectedStages.map((stage) => {
                      const override = findOverride(
                        selectedBrand,
                        selectedModel,
                        selectedYear,
                        selectedEngine,
                        stage.name,
                      );

                      const currentInputs = stageInputs[stage.name] || {};
                      const price =
                        currentInputs.price !== undefined
                          ? currentInputs.price
                          : override?.price !== undefined
                            ? override.price
                            : stage.price;
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
                                {stage.name.replace("Steg", "Stage")}{" "}
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
                                    {new Intl.NumberFormat(
                                      currency === "SEK" ? "sv-SE" : "en-US",
                                      {
                                        style: "currency",
                                        currency,
                                        maximumFractionDigits: 0, // or use 2 if needed
                                      },
                                    ).format(
                                      convertCurrency(stage.price, currency),
                                    )}
                                    {currency === "SEK" && (
                                      <span className="text-xs text-gray-400 ml-1">
                                        (SEK)
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
                                    type="number"
                                    value={
                                      stageInputs[stage.name]?.price !==
                                      undefined
                                        ? toCurrency(
                                            Number(
                                              stageInputs[stage.name].price,
                                            ),
                                            currency,
                                          )
                                        : toCurrency(
                                            Number(
                                              override?.price ?? stage.price,
                                            ),
                                            currency,
                                          )
                                    }
                                    onChange={(e) => {
                                      const inputValue = parseFloat(
                                        e.target.value,
                                      );
                                      const valueInSek = isNaN(inputValue)
                                        ? 0
                                        : fromCurrency(inputValue, currency); // konvertera till SEK

                                      handleInputChange(
                                        stage.name,
                                        "price",
                                        valueInSek,
                                      ); // spara SEK
                                    }}
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
                                      e.target.value,
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
                                      e.target.value,
                                    )
                                  }
                                  className="focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                                  type="number"
                                />
                              </div>
                            </div>

                            <button
                              onClick={() => {
                                const priceInSek =
                                  stageInputs[stage.name]?.price ??
                                  override?.price ??
                                  stage.price;

                                handleSave(
                                  override?._id || null,
                                  selectedBrand,
                                  selectedModel,
                                  selectedYear,
                                  selectedEngine,
                                  stage.name,
                                  priceInSek, // ✅ Enkelt, tydligt
                                  Number(hk),
                                  Number(nm),
                                );
                              }}
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
        <footer className="bg-gray-800 text-gray-300 py-4 px-4 text-sm sm:text-base">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <p className="text-sm">
                COPYRIGHT © {new Date().getFullYear()} AK-TUNING | Made by
                ADNAN KADRIC
              </p>
              <p className="text-xs mt-2 text-gray-400">
                All rights reserved | Version 1.0.0
              </p>
            </div>
          </div>
        </footer>
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

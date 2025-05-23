// lib/translations.ts
export const translations = {
  sv: {
    selectBrand: "VÄLJ MÄRKE",
    selectModel: "VÄLJ MODELL",
    selectYear: "VÄLJ ÅRSMODELL",
    selectEngine: "VÄLJ MOTOR",
    headline: "Välj din bil nedan för att se vad vi kan erbjuda",
    contact: "KONTAKT",
    fuelPetrol: "Bensin",
    originalHp: "ORIGINAL HK",
    stageLabel: "Steg",
    stockHp: "Original HK",
  },
  en: {
    selectBrand: "SELECT BRAND",
    selectModel: "SELECT MODEL",
    selectYear: "SELECT YEAR",
    selectEngine: "SELECT ENGINE",
    headline: "Select your car below to see what we can offer",
    contact: "CONTACT",
    fuelPetrol: "Petrol",
    originalHp: "Stock HP",
    stageLabel: "Stage",
    stockHp: "Stock HP",
  },
  de: {
    selectBrand: "MARKE WÄHLEN",
    selectModel: "MODELL WÄHLEN",
    selectYear: "BAUJAHR WÄHLEN",
    selectEngine: "MOTOR WÄHLEN",
    headline: "Wähle dein Auto unten aus, um unser Angebot zu sehen",
    contact: "KONTAKT",
    fuelPetrol: "Benzin",
    originalHp: "Serien-PS",
    stageLabel: "Stufe",
    stockHp: "Serien-PS",
  },
};

export const t = (lang: string, key: keyof typeof translations["sv"]) => {
  return translations[lang]?.[key] ?? translations["sv"][key];
};

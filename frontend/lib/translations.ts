export const translations = {"selectCar": {"sv": "Välj din bil nedan för att se vad vi kan erbjuda", "en": "Select your car below to see what we can offer", "de": "Wählen Sie Ihr Auto unten aus, um zu sehen, was wir anbieten können"}, "stock": {"sv": "Original", "en": "Stock", "de": "Serie"}, "stage": {"sv": "Steg", "en": "Stage", "de": "Stufe"}, "petrol": {"sv": "Bensin", "en": "Petrol", "de": "Benzin"}, "contact": {"sv": "KONTAKT", "en": "CONTACT", "de": "KONTAKT"}, "selectBrand": {"sv": "VÄLJ MÄRKE", "en": "SELECT BRAND", "de": "MARKE WÄHLEN"}, "selectModel": {"sv": "VÄLJ MODELL", "en": "SELECT MODEL", "de": "MODELL WÄHLEN"}, "selectYear": {"sv": "VÄLJ ÅRSMODELL", "en": "SELECT YEAR", "de": "BAUJAHR WÄHLEN"}, "selectEngine": {"sv": "VÄLJ MOTOR", "en": "SELECT ENGINE", "de": "MOTOR WÄHLEN"}};

export function t(key: keyof typeof translations, lang: string): string {
  return translations[key]?.[lang] || translations[key]?.sv || key;
}

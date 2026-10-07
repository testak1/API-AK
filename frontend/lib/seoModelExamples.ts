type SeoModel = {
  name?: string;
  years?: Array<{
    engines?: unknown[];
  }>;
};

const POPULAR_MODELS: Record<string, string[]> = {
  "alfa romeo": ["Giulia", "Stelvio", "Giulietta", "159", "MiTo", "147", "4C", "GT"],
  audi: ["A4", "A5", "A6", "A7", "RS3", "RS6", "RSQ8", "Q5"],
  bmw: ["3-Serien", "5-Serien", "X5", "4-Serien", "M3", "M5", "M4", "X3"],
  citroen: ["C4", "C3", "Berlingo", "C5", "C4 Picasso", "C3 Aircross"],
  cupra: ["Formentor", "Leon", "Ateca"],
  fiat: ["500 / 595 / 695", "Ducato", "Doblo", "500X", "Panda", "Tipo", "Grande Punto", "124 Spider"],
  ford: ["Focus", "Mustang", "Mondeo", "Kuga/Escape", "Fiesta", "Ranger", "Transit / Transit Custom", "S-Max"],
  honda: ["Civic", "CR-V", "Accord", "HR-V", "NSX"],
  hyundai: ["i 30", "Tucson", "i 20", "Santa Fe", "i 40", "Kona", "Genesis", "ix 35"],
  jaguar: ["F-Pace", "XF", "XE", "F-Type / S / Project 7", "XJ", "XKR", "XFR-S", "E-Pace"],
  jeep: ["Grand Cherokee", "Wrangler", "Renegade", "Cherokee", "Compass", "Gladiator", "Commander", "Patriot"],
  kia: ["Cee'd", "Sportage", "Stinger", "Sorento", "Rio", "X-Ceed", "Optima", "Picanto"],
  "land rover": ["Range Rover", "Discovery", "Evoque", "Defender", "Velar", "Discovery Sport", "Freelander"],
  mazda: ["Mazda 3", "Mazda 6", "CX-5", "MX5", "CX-3", "RX8", "CX-30", "MPS"],
  mercedes: ["C", "E", "A", "GLC", "GLE", "CLA", "CLS", "GT"],
  mini: ["Cooper S ...", "Cooper", "Countryman", "Clubman", "One / One D / Minimalist", "Paceman", "Roadster/Coupé"],
  mitsubishi: ["Outlander", "ASX", "Pajero", "L200"],
  nissan: ["GTR", "Qashqai", "X-Trail", "Juke", "NP 300 - Navara", "370Z", "350Z", "Micra"],
  opel: ["Astra", "Insignia / Insignia Grand Sport", "Corsa", "Mokka", "Zafira Tourer", "Vivaro", "Vectra", "GT"],
  peugeot: ["308", "508", "3008", "208", "5008", "RCZ", "2008", "Expert"],
  porsche: ["911", "Cayenne", "Panamera", "Macan", "Cayman", "Boxster", "Spyder", "Carrera GT"],
  renault: ["Megane", "Clio", "Scenic / Grand Scenic", "Captur / QM3", "Kadjar", "Laguna", "Espace", "Twingo"],
  saab: ["9-3", "9-5", "900", "9000", "9-4X", "9-7X"],
  seat: ["Leon", "Ibiza", "Ateca", "Tarraco", "Alhambra", "Exeo", "Arona", "Toledo"],
  skoda: ["Octavia", "Superb", "Kodiaq", "Fabia", "Yeti", "Karoq", "Rapid", "Scala"],
  subaru: ["Impreza", "Forester", "Outback", "BRZ", "Legacy", "XV", "Levorg"],
  toyota: ["Corolla", "Rav4", "Yaris", "Land Cruiser", "Hilux", "GT86", "Avensis", "Auris"],
  volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Touareg", "Transporter / Multivan", "Scirocco", "Arteon"],
  volvo: ["XC60", "V60", "XC90", "S60", "V70", "XC70", "V90/S90", "V40"],
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\[lastbil\]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const matchesPreferredName = (modelName: string, preferredName: string) => {
  const model = normalize(modelName);
  const preferred = normalize(preferredName);
  if (model === preferred) return true;

  const modelParts = modelName.split(/\s*\/\s*/).map(normalize);
  const preferredParts = preferredName.split(/\s*\/\s*/).map(normalize);
  return preferredParts.some(part => modelParts.includes(part));
};

const availableModelScore = (model: SeoModel) => {
  const years = model.years || [];
  const engines = years.reduce(
    (total, year) => total + (year.engines?.length || 0),
    0,
  );
  return engines * 10 + years.length;
};

export const getPopularModelExamples = (
  brandName: string,
  models: SeoModel[],
  limit = 8,
) => {
  const remaining = models.filter(model => model.name?.trim());
  const preferred = POPULAR_MODELS[normalize(brandName)] || [];
  const selected: SeoModel[] = [];

  for (const preferredName of preferred) {
    const match = remaining.find(
      model =>
        model.name &&
        !selected.includes(model) &&
        matchesPreferredName(model.name, preferredName),
    );
    if (match) selected.push(match);
    if (selected.length === limit) break;
  }

  if (selected.length < limit) {
    const fallback = remaining
      .filter(model => !selected.includes(model))
      .sort(
        (left, right) =>
          availableModelScore(right) - availableModelScore(left) ||
          (left.name || "").localeCompare(right.name || "", "sv"),
      );
    selected.push(...fallback.slice(0, limit - selected.length));
  }

  return selected.slice(0, limit);
};

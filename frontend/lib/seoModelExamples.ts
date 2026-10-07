type SeoModel = {
  name?: string;
  years?: Array<{
    engines?: unknown[];
  }>;
};

const POPULAR_MODELS: Record<string, string[]> = {
  "alfa romeo": ["Giulia", "Stelvio", "Giulietta", "159", "MiTo", "Brera"],
  audi: ["A4", "A6", "A3", "Q5", "Q7", "A5"],
  bmw: ["3-Serien", "5-Serien", "X5", "X3", "1-Serien", "4-Serien"],
  citroen: ["C4", "C3", "Berlingo", "C5", "C4 Picasso", "C3 Aircross"],
  cupra: ["Formentor", "Leon", "Ateca", "Born", "Terramar", "Tavascan"],
  fiat: ["500", "Ducato", "Panda", "Tipo", "Doblo", "Punto"],
  ford: ["Focus", "Mondeo", "Kuga", "Fiesta", "Ranger", "Transit"],
  honda: ["Civic", "CR-V", "Accord", "HR-V", "Jazz", "S2000"],
  hyundai: ["i30", "Tucson", "Santa Fe", "i20", "Kona", "i40"],
  jaguar: ["F-Pace", "XF", "XE", "F-Type", "XJ", "E-Pace"],
  jeep: ["Grand Cherokee", "Wrangler", "Compass", "Renegade", "Cherokee", "Gladiator"],
  kia: ["Ceed", "Sportage", "Sorento", "Stinger", "Rio", "Picanto"],
  landrover: ["Range Rover", "Range Rover Sport", "Discovery", "Defender", "Evoque", "Freelander"],
  mazda: ["Mazda 3", "Mazda 6", "CX-5", "CX-30", "MX-5", "CX-60"],
  mercedes: ["C", "E", "A", "GLC", "GLE", "S"],
  mini: ["Cooper", "Countryman", "Clubman", "Paceman", "One", "John Cooper Works"],
  mitsubishi: ["Outlander", "Lancer", "ASX", "Pajero", "Eclipse Cross", "Colt"],
  nissan: ["Qashqai", "X-Trail", "Juke", "Navara", "GTR", "Micra"],
  opel: ["Astra", "Insignia", "Corsa", "Mokka", "Zafira", "Vivaro"],
  peugeot: ["308", "508", "3008", "208", "5008", "Expert"],
  porsche: ["911", "Cayenne", "Macan", "Panamera", "Boxster", "Cayman"],
  renault: ["Megane", "Clio", "Captur", "Kadjar", "Scenic", "Espace"],
  saab: ["9-3", "9-5", "900", "9000", "9-4X", "9-7X"],
  seat: ["Leon", "Ibiza", "Ateca", "Tarraco", "Arona", "Alhambra"],
  skoda: ["Octavia", "Superb", "Kodiaq", "Karoq", "Fabia", "Yeti"],
  subaru: ["Impreza", "Forester", "Outback", "Legacy", "BRZ", "XV"],
  toyota: ["Corolla", "Rav4", "Yaris", "Land Cruiser", "Hilux", "Supra"],
  volkswagen: ["Golf", "Passat", "Tiguan", "Polo", "Transporter", "Touareg"],
  volvo: ["XC60", "V60", "XC90", "S60", "V70", "XC70"],
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
  limit = 6,
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

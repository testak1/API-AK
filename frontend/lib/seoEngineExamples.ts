type EngineLike = {
  label?: string | null;
  fuel?: string | null;
};

const cleanLabel = (label: string) =>
  label.replace(/\.\.\./g, "").replace(/\s+/g, " ").trim();

const engineFamily = (label: string) =>
  cleanLabel(label)
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/[-–]?\s*\d+\s*(?:hk|hp|ps)\b.*$/i, "")
    .replace(/\s+/g, " ")
    .trim();

const fuelGroup = (fuel = "") => {
  const normalized = fuel.toLowerCase();
  if (normalized.includes("diesel")) return "diesel";
  if (normalized.includes("hybrid") || normalized.includes("el")) {
    return "electrified";
  }
  if (normalized.includes("bensin") || normalized.includes("petrol")) {
    return "petrol";
  }
  return "other";
};

const horsepower = (label: string) => {
  const values = Array.from(label.matchAll(/(\d{2,4})\s*(?:hk|hp|ps)\b/gi)).map(
    match => Number(match[1]),
  );
  return values.length ? Math.max(...values) : 0;
};

const PERFORMANCE_PATTERN =
  /\b(?:amg|rs\d*|m\d+|gti|gts|type\s*r|quadrifoglio|cupra|nismo|turbo\s*s|v8|v10|v12|srt|st\b|shelby)\b/i;

export function getRepresentativeEngines(engines: EngineLike[]) {
  const records = engines
    .filter((engine): engine is Required<EngineLike> => Boolean(engine.label))
    .map(engine => ({
      label: cleanLabel(engine.label),
      family: engineFamily(engine.label),
      fuel: fuelGroup(engine.fuel || ""),
      horsepower: horsepower(engine.label),
    }));

  const familyCounts = new Map<string, number>();
  records.forEach(record => {
    familyCounts.set(record.family, (familyCounts.get(record.family) || 0) + 1);
  });

  const combustionRecords = records.filter(
    record => record.fuel !== "electrified",
  );
  const ranked = [...combustionRecords].sort((a, b) => {
    const frequency =
      (familyCounts.get(b.family) || 0) - (familyCounts.get(a.family) || 0);
    return frequency || b.horsepower - a.horsepower;
  });
  const selected: string[] = [];

  const addFromGroup = (group: string, count: number) => {
    for (const record of ranked.filter(item => item.fuel === group)) {
      if (!selected.includes(record.label)) selected.push(record.label);
      if (selected.filter(label => records.find(item => item.label === label)?.fuel === group).length >= count) break;
    }
  };

  addFromGroup("petrol", 2);
  addFromGroup("diesel", 2);

  const performance = [...combustionRecords]
    .filter(record => PERFORMANCE_PATTERN.test(record.label) || record.horsepower >= 300)
    .sort((a, b) => b.horsepower - a.horsepower)[0];
  if (performance && !selected.includes(performance.label)) {
    selected.push(performance.label);
  }

  for (const record of ranked) {
    if (selected.length >= 7) break;
    if (!selected.includes(record.label)) selected.push(record.label);
  }

  return selected.slice(0, 7);
}

export type DynoCurveKind = "power" | "torque";

export const getDynoRpmLabels = (fuelType = ""): string[] => {
  const isDiesel = fuelType.toLowerCase().includes("diesel");
  const maxRpm = isDiesel ? 5000 : 7000;
  const step = isDiesel ? 500 : 1000;
  const labels: string[] = [];

  for (let rpm = 1000; rpm <= maxRpm; rpm += step) labels.push(String(rpm));
  return labels;
};

/** Deterministic simulated profile shared with the warranty certificate. */
export const generateDynoCurve = (
  peakValue: number,
  kind: DynoCurveKind,
  fuelType = ""
): number[] => {
  const isDiesel = fuelType.toLowerCase().includes("diesel");
  const factors = kind === "power"
    ? (isDiesel
        ? [0.08, 0.28, 0.55, 0.75, 0.9, 0.98, 1, 0.97, 0.91]
        : [0.05, 0.22, 0.45, 0.68, 0.88, 1, 0.93])
    : (isDiesel
        ? [0.18, 0.52, 0.88, 0.99, 1, 0.97, 0.88, 0.74, 0.58]
        : [0.22, 0.5, 0.78, 0.97, 0.98, 1, 0.82]);

  return factors.map(factor => Math.round(peakValue * factor * 10) / 10);
};

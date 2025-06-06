// lib/utils.ts
import { createHash } from "crypto";

export function generateETag(content: string): string {
  return createHash("sha1").update(content).digest("hex");
}

export const generateDynoCurve = (
  peakValue: number,
  isHp: boolean,
  fuelType: string,
) => {
  // Välj RPM range beroende på motor
  const rpmRange = fuelType.toLowerCase().includes("diesel")
    ? [1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000]
    : [2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000];

  const peakIndex = isHp
    ? Math.floor(rpmRange.length * 0.6)
    : Math.floor(rpmRange.length * 0.4);
  const startIndex = 0;

  return rpmRange.map((rpm, i) => {
    const startRpm = rpmRange[startIndex];
    const peakRpm = rpmRange[peakIndex];
    const endRpm = rpmRange[rpmRange.length - 1];

    if (rpm <= peakRpm) {
      const progress = (rpm - startRpm) / (peakRpm - startRpm);
      return peakValue * (0.5 + 0.5 * Math.pow(progress, 1.2));
    } else {
      const fallProgress = (rpm - peakRpm) / (endRpm - peakRpm);
      return peakValue * (1 - 0.35 * Math.pow(fallProgress, 1));
    }
  });
};

export const getStageColor = (stageName: string) => {
  const name = stageName.toLowerCase();
  if (name.includes("steg 1")) return "text-red-500";
  if (name.includes("steg 2")) return "text-orange-400";
  if (name.includes("steg 3")) return "text-purple-400";
  if (name.includes("steg 4")) return "text-yellow-400";
  if (name.includes("dsg")) return "text-blue-400";
  return "text-white"; // fallback
};

export function extractPlainTextFromDescription(description: any): string {
  if (!Array.isArray(description)) return "";

  return description
    .map((block) => {
      if (block._type === "block" && Array.isArray(block.children)) {
        return block.children
          .map((child) => (typeof child.text === "string" ? child.text : ""))
          .join("");
      }
      // Handle custom block types with simple 'text' field fallback
      if (typeof block.text === "string") {
        return block.text;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n")
    .trim();
}

export const slugify = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const slugifyStage = (str: string) =>
  str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]/g, "");

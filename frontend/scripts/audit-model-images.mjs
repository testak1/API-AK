import {readFile, mkdir, writeFile} from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const inputPath = path.join(projectDirectory, "public", "data", "all_models.json");
const outputDirectory = path.join(projectDirectory, "reports");

const records = JSON.parse(await readFile(inputPath, "utf8"));
const dimensionPattern = /-(\d+)x(\d+)\.(?:png|jpe?g|webp)(?:\?|$)/i;

const classify = (width, height) => {
  if (width < 400 || height < 180) return "critical";
  if (width < 600 || height < 280) return "review";
  return "good";
};

const rank = {critical: 0, review: 1, good: 2, unknown: 3};
const rows = records
  .map(record => {
    const match = String(record.image_url || "").match(dimensionPattern);
    const width = match ? Number(match[1]) : null;
    const height = match ? Number(match[2]) : null;
    const status = width && height ? classify(width, height) : "unknown";
    return {
      brand: record.brand || "",
      model: record.name || "",
      width,
      height,
      megapixels:
        width && height ? Number(((width * height) / 1_000_000).toFixed(3)) : null,
      status,
      replace: status === "critical",
      imageUrl: record.image_url || "",
    };
  })
  .sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      a.brand.localeCompare(b.brand) ||
      a.model.localeCompare(b.model),
  );

const summaryByBrand = Object.values(
  rows.reduce((summary, row) => {
    summary[row.brand] ||= {
      brand: row.brand,
      total: 0,
      critical: 0,
      review: 0,
      good: 0,
      unknown: 0,
    };
    summary[row.brand].total += 1;
    summary[row.brand][row.status] += 1;
    return summary;
  }, {}),
).sort((a, b) => b.critical - a.critical || a.brand.localeCompare(b.brand));

const counts = rows.reduce(
  (result, row) => {
    result[row.status] += 1;
    return result;
  },
  {critical: 0, review: 0, good: 0, unknown: 0},
);

const report = {
  generatedAt: new Date().toISOString(),
  criteria: {
    critical: "width < 400px or height < 180px",
    review: "width < 600px or height < 280px",
    good: "width >= 600px and height >= 280px",
  },
  totals: {
    records: rows.length,
    uniqueImageUrls: new Set(rows.map(row => row.imageUrl)).size,
    ...counts,
  },
  brands: summaryByBrand,
  images: rows,
};

const csvValue = value => {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
};
const csvHeader = [
  "brand",
  "model",
  "width",
  "height",
  "megapixels",
  "status",
  "replace",
  "imageUrl",
];
const csv = [
  csvHeader.join(","),
  ...rows.map(row => csvHeader.map(key => csvValue(row[key])).join(",")),
].join("\n");

await mkdir(outputDirectory, {recursive: true});
await writeFile(
  path.join(outputDirectory, "model-image-audit.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);
await writeFile(path.join(outputDirectory, "model-image-audit.csv"), `${csv}\n`);

console.log(JSON.stringify(report.totals, null, 2));

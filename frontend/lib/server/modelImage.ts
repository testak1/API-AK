import {readFile} from "node:fs/promises";
import path from "node:path";

type ModelImageRecord = {
  name?: string;
  brand?: string;
  image_url?: string;
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

async function readModelImages() {
  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "all_models.json",
  );
  return JSON.parse(await readFile(filePath, "utf8")) as ModelImageRecord[];
}

const findModelImage = (
  records: ModelImageRecord[],
  brand: string,
  model: string,
) => {
  const normalizedBrand = normalize(brand);
  const normalizedModel = normalize(model);
  const brandRecords = records.filter(
    record => normalize(record.brand || "") === normalizedBrand,
  );
  const exact = brandRecords.find(
    record => normalize(record.name || "") === normalizedModel,
  );
  const fuzzy = brandRecords.find(record =>
    normalize(record.name || "").includes(normalizedModel),
  );
  return exact?.image_url || fuzzy?.image_url || null;
};

export async function getModelImageUrl(brand: string, model: string) {
  try {
    return findModelImage(await readModelImages(), brand, model);
  } catch {
    return null;
  }
}

export async function getModelImageUrls(brand: string, models: string[]) {
  try {
    const records = await readModelImages();
    return Object.fromEntries(
      models.map(model => [model, findModelImage(records, brand, model)]),
    );
  } catch {
    return Object.fromEntries(models.map(model => [model, null]));
  }
}

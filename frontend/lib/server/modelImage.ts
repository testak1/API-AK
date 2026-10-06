import {readFile} from "node:fs/promises";
import path from "node:path";

type ModelImageRecord = {
  name?: string;
  brand?: string;
  image_url?: string;
};

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]/g, "");

export async function getModelImageUrl(brand: string, model: string) {
  try {
    const filePath = path.join(
      process.cwd(),
      "public",
      "data",
      "all_models.json",
    );
    const records = JSON.parse(
      await readFile(filePath, "utf8"),
    ) as ModelImageRecord[];
    const normalizedBrand = normalize(brand);
    const normalizedModel = normalize(model);
    const match = records.find(record => {
      const recordBrand = normalize(record.brand || "");
      const recordModel = normalize(record.name || "");
      return (
        recordBrand === normalizedBrand &&
        (recordModel === normalizedModel ||
          recordModel.includes(normalizedModel))
      );
    });

    return match?.image_url || null;
  } catch {
    return null;
  }
}

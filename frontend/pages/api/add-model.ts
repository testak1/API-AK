import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, id, image_url, brand } = req.body;

  if (!name || !id || !image_url || !brand) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const filePath = path.join(
    process.cwd(),
    "public",
    "data",
    "all_models.json",
  );

  try {
    const fileData = fs.readFileSync(filePath, "utf8");
    const models = JSON.parse(fileData);
    models.push({ name, id, image_url, brand });
    fs.writeFileSync(filePath, JSON.stringify(models, null, 2));
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to update models file", err);
    res.status(500).json({ error: "Failed to update models file" });
  }
}

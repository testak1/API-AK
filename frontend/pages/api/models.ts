import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "public", "data", "all_models.json");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "GET") {
    try {
      const data = fs.readFileSync(filePath, "utf8");
      return res.status(200).json({ models: JSON.parse(data) });
    } catch (err) {
      console.error("Failed to load models", err);
      return res.status(500).json({ error: "Failed to load models" });
    }
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const data = fs.readFileSync(filePath, "utf8");
    const models = JSON.parse(data);

    if (req.method === "PUT") {
      const { id, image_url, name, brand } = req.body;
      const idx = models.findIndex((m: any) => m.id === id);
      if (idx === -1) return res.status(404).json({ error: "Model not found" });
      if (image_url) models[idx].image_url = image_url;
      if (name) models[idx].name = name;
      if (brand) models[idx].brand = brand;
      fs.writeFileSync(filePath, JSON.stringify(models, null, 2));
      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.body;
      const filtered = models.filter((m: any) => m.id !== id);
      fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2));
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Failed to update models file", err);
    return res.status(500).json({ error: "Failed to update models file" });
  }
}

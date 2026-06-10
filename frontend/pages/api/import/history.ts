import {NextApiRequest, NextApiResponse} from "next";
import {sanityClient} from "@/lib/sanity.server";

interface HistoryEntry {
  _key?: string;
  importedAt?: string;
  brand?: string;
  model?: string;
  year?: string;
  engine?: string;
  stages?: string[];
  status?: "created" | "exists" | "error";
  action?: string;
  message?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    try {
      const batches = await sanityClient.fetch(
        `*[_type == "importHistory"] | order(importedAt desc)[0...100]{
          _id,
          importedAt,
          entries[]{
            _key,
            importedAt,
            brand,
            model,
            year,
            engine,
            stages,
            status,
            action,
            message
          }
        }`
      );

      const entries = batches
        .flatMap((batch: any) =>
          (batch.entries || []).map((entry: HistoryEntry) => ({
            id: `${batch._id}-${entry._key}`,
            vehicleId: getEngineId(entry),
            importedAt: entry.importedAt || batch.importedAt,
            brand: entry.brand,
            model: entry.model,
            year: entry.year,
            engine: entry.engine,
            stages: entry.stages || [],
            status: entry.status || "error",
            action: entry.action,
            message: entry.message,
          }))
        )
        .filter((entry: any) => entry.importedAt)
        .sort((a: any, b: any) =>
          String(b.importedAt).localeCompare(String(a.importedAt))
        )
        .slice(0, 1000);

      return res.status(200).json({entries});
    } catch (error: any) {
      console.error("Kunde inte hämta importhistorik:", error);
      return res.status(500).json({
        message: "Kunde inte hämta importhistorik",
        error: error.message,
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const ids = await sanityClient.fetch(`*[_type == "importHistory"]._id`);

      const transaction = sanityClient.transaction();
      ids.forEach((id: string) => transaction.delete(id));
      await transaction.commit();

      return res.status(200).json({message: "Importhistorik raderad"});
    } catch (error: any) {
      console.error("Kunde inte radera importhistorik:", error);
      return res.status(500).json({
        message: "Kunde inte radera importhistorik",
        error: error.message,
      });
    }
  }

  return res.status(405).json({message: "Endast GET eller DELETE tillåtet"});
}

function getEngineId(item: HistoryEntry): string {
  return `${item.brand || ""}-${item.model || ""}-${item.year || ""}-${
    item.engine || ""
  }`
    .replace(/\s+/g, "_")
    .toLowerCase();
}

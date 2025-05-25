// pages/api/bulk-overrides.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { brand, model, year, stage1Price, stage2Price } = req.body;

  if (!brand) {
    return res.status(400).json({ error: "Missing brand" });
  }

  try {
    // 1. Hämta dokument att radera
    const query = `*[_type == "resellerOverride" &&
      resellerId == $resellerId &&
      brand == $brand &&
      ${model ? "model == $model" : "!defined(model)"} &&
      ${year ? "year == $year" : "!defined(year)"}]._id`;

    const idsToDelete = await sanity.fetch(query, {
      resellerId,
      brand,
      model,
      year,
    });

    let tx = sanity.transaction();

    // 2. Radera gamla
    for (const id of idsToDelete) {
      tx = tx.delete(id);
    }

    // 3. Skapa nya
    if (stage1Price) {
      tx = tx.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || undefined,
        year: year || undefined,
        stageName: "Stage 1",
        price: Number(stage1Price),
        tunedHk: null,
        tunedNm: null,
      });
    }

    if (stage2Price) {
      tx = tx.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || undefined,
        year: year || undefined,
        stageName: "Stage 2",
        price: Number(stage2Price),
        tunedHk: null,
        tunedNm: null,
      });
    }

    // 4. Bara spara om det finns ändringar
    if (idsToDelete.length || stage1Price || stage2Price) {
      await tx.commit();
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Bulk override error:", err.message);
    res
      .status(500)
      .json({ error: "Internal Server Error", detail: err.message });
  }
}

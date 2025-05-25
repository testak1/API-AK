import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

interface BulkOverrideRequest {
  brand: string;
  model?: string;
  year?: string;
  stage1Price?: number;
  stage2Price?: number;
  stage1Description?: string;
  stage2Description?: string;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    brand,
    model,
    year,
    stage1Price,
    stage2Price,
    stage1Description,
    stage2Description,
  } = req.body as BulkOverrideRequest;

  try {
    // Build GROQ query filter
    const filters = [
      `_type == "resellerOverride"`,
      `resellerId == $resellerId`,
      `brand == $brand`,
      model ? `model == $model` : `!defined(model)`,
      year ? `year == $year` : `!defined(year)`,
      `!isGlobalDescription`,
    ];
    const query = `*[${filters.join(" && ")}]`;

    const params: Record<string, any> = { resellerId, brand };
    if (model) params.model = model;
    if (year) params.year = year;

    // 1. Delete existing overrides in scope
    const existingOverrides = await sanity.fetch(query, params);
    const transaction = sanity.transaction();

    existingOverrides.forEach((doc) => {
      if (doc._id) transaction.delete(doc._id);
    });

    // 2. Create new overrides
    if (stage1Price) {
      transaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 1",
        price: Number(stage1Price),
        stageDescription: stage1Description || null,
        isGlobalDescription: false,
      });
    }

    if (stage2Price) {
      transaction.create({
        _type: "resellerOverride",
        resellerId,
        brand,
        model: model || null,
        year: year || null,
        stageName: "Stage 2",
        price: Number(stage2Price),
        stageDescription: stage2Description || null,
        isGlobalDescription: false,
      });
    }

    await transaction.commit();

    // 3. Return updated overrides
    const updatedOverrides = await sanity.fetch(query, params);
    return res.status(200).json(updatedOverrides);
  } catch (err) {
    console.error("Bulk override error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      details: err.message,
    });
  }
}

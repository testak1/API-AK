import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const { resellerId, descriptions } = req.body;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 1. First delete all existing global descriptions
    const existing = await sanity.fetch(
      `*[_type == "resellerOverride" && resellerId == $resellerId && isGlobalDescription == true]`,
      { resellerId },
    );

    const transaction = sanity.transaction();

    // Delete existing
    existing.forEach((doc) => {
      if (doc._id) transaction.delete(doc._id);
    });

    // Create new ones
    Object.entries(descriptions).forEach(([stageName, description]) => {
      if (description) {
        transaction.create({
          _type: "resellerOverride",
          resellerId,
          stageName,
          stageDescription: description,
          isGlobalDescription: true,
        });
      }
    });

    await transaction.commit();

    // Return the new state
    const updated = await sanity.fetch(
      `*[_type == "resellerOverride" && resellerId == $resellerId && isGlobalDescription == true]`,
      { resellerId },
    );

    const descriptionsMap = updated.reduce((acc, desc) => {
      acc[desc.stageName] = desc.stageDescription;
      return acc;
    }, {});

    return res.status(200).json(descriptionsMap);
  } catch (error) {
    console.error("Error saving global descriptions:", error);
    return res.status(500).json({
      error: "Failed to save descriptions",
      details: error.message,
    });
  }
}

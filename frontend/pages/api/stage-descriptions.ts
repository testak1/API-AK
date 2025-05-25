import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "POST") {
      const { stageName, description } = req.body;

      if (!stageName || !description) {
        return res.status(400).json({ error: "Missing data" });
      }

      const existing = await sanity.fetch(
        `*[_type == "resellerStageOverride" && resellerId == $resellerId && stageName == $stageName][0]`,
        { resellerId, stageName },
      );

      if (existing?._id) {
        await sanity.patch(existing._id).set({ description }).commit();
      } else {
        await sanity.create({
          _type: "resellerStageOverride",
          resellerId,
          stageName,
          description,
        });
      }

      return res.status(200).json({ success: true });
    }

    // GET handler
    const [defaults, overrides] = await Promise.all([
      sanity.fetch(`*[_type == "stageDescription"]{stageName, description}`),
      sanity.fetch(
        `*[_type == "resellerStageOverride" && resellerId == $resellerId]{stageName, description}`,
        { resellerId },
      ),
    ]);

    const merged = defaults.map((def) => {
      const override = overrides.find((o) => o.stageName === def.stageName);
      return {
        stageName: def.stageName,
        description: override?.description || def.description,
        isOverride: !!override,
      };
    });

    return res.status(200).json({ descriptions: merged });
  } catch (err) {
    console.error("Failed to fetch or update stage descriptions", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // Allow resellerId from query param if not logged in
  const resellerId = session?.user?.resellerId || req.query.resellerId || null;

  try {
    if (req.method === "POST") {
      // ❗️Write actions still require authentication
      if (!session?.user?.resellerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { stageName, description } = req.body;

      if (!stageName || !description) {
        return res.status(400).json({ error: "Missing data" });
      }

      const existing = await sanity.fetch(
        `*[_type == "resellerStageOverride" && resellerId == $resellerId && stageName == $stageName][0]`,
        { resellerId: session.user.resellerId, stageName },
      );

      if (existing?._id) {
        await sanity.patch(existing._id).set({ description }).commit();
      } else {
        await sanity.create({
          _type: "resellerStageOverride",
          resellerId: session.user.resellerId,
          stageName,
          description,
        });
      }

      return res.status(200).json({ success: true });
    }

    // GET handler
    const [defaults, overrides] = await Promise.all([
      sanity.fetch(`*[_type == "stageDescription"]{stageName, description}`),
      resellerId
        ? sanity.fetch(
            `*[_type == "resellerStageOverride" && resellerId == $resellerId]{stageName, description}`,
            { resellerId },
          )
        : Promise.resolve([]),
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

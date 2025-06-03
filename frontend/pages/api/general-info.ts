import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // Allow query-based fallback if no session
  const resellerId = session?.user?.resellerId || req.query.resellerId || null;

  try {
    const [defaults, override] = await Promise.all([
      sanity.fetch(`*[_type == "generalInfo"][0]{content}`),
      resellerId
        ? sanity.fetch(
            `*[_type == "resellerGeneralOverride" && resellerId == $resellerId][0]{content}`,
            { resellerId },
          )
        : Promise.resolve(null),
    ]);

    const merged = {
      content: override?.content || defaults?.content || [],
      isOverride: !!override,
    };

    if (req.method === "POST") {
      if (!session?.user?.resellerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { content } = req.body;
      if (!content) {
        return res.status(400).json({ error: "Missing content" });
      }

      const existing = await sanity.fetch(
        `*[_type == "resellerGeneralOverride" && resellerId == $resellerId][0]{_id}`,
        { resellerId: session.user.resellerId },
      );

      if (existing?._id) {
        await sanity.patch(existing._id).set({ content }).commit();
      } else {
        await sanity.create({
          _type: "resellerGeneralOverride",
          resellerId: session.user.resellerId,
          content,
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ generalInfo: merged });
  } catch (err) {
    console.error("Error fetching general info:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

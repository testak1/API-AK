import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { urlFor } from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  try {
    const [defaults, overrides] = await Promise.all([
      sanity.fetch(`*[_type == "aktPlus"]{
        _id,
        title,
        description,
        price,
        installationTime,
        "imageUrl": gallery[0].asset->url
      }`),
      sanity.fetch(
        `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId]{
          aktPlusId->{_id},
          title,
          description
        }`,
        { resellerId }
      ),
    ]);

    const merged = defaults.map((item) => {
      const override = overrides.find((o) => o.aktPlusId?._id === item._id);

      return {
        id: item._id,
        title: override?.title || item.title,
        description: override?.description || item.description,
        price: item.price ?? 0,
        imageUrl: item.gallery?.[0]?.asset
          ? urlFor(item.gallery[0].asset).width(80).url()
          : null,
        installationTime: item.installationTime ?? 1,
        isOverride: !!override,
      };
    });

    if (req.method === "POST") {
      const { aktPlusId, title, description } = req.body;

      if (!aktPlusId || !description) {
        return res.status(400).json({ error: "Missing data" });
      }

      const existing = await sanity.fetch(
        `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId && aktPlusId._ref == $aktPlusId][0]{_id}`,
        { resellerId, aktPlusId }
      );

      if (existing?._id) {
        await sanity.patch(existing._id).set({ title, description }).commit();
      } else {
        await sanity.create({
          _type: "resellerAktPlusOverride",
          resellerId,
          aktPlusId: { _type: "reference", _ref: aktPlusId },
          title,
          description,
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ aktplus: merged });
  } catch (err) {
    console.error("Error in AKTPLUS descriptions:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

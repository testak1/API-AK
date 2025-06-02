import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity, { urlFor } from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  const lang = req.query.lang || "sv";

  try {
    // Fetch defaults and overrides
    const [defaults, overrides] = await Promise.all([
      sanity.fetch(`
        *[_type == "aktPlus"]{
          _id,
          title,
          description,
          price,
          installationTime,
          gallery
        }
      `),
      sanity.fetch(
        `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId]{
          _id,
          aktPlusId->{_id},
          title,
          description,
          price,
          gallery
        }`,
        { resellerId },
      ),
    ]);

    const merged = defaults.map((item) => {
      const override = overrides.find((o) => o.aktPlusId?._id === item._id);

      const resolveLang = (field) =>
        typeof field === "object"
          ? field?.[lang] || field?.sv || ""
          : field || "";

      const gallery = override?.gallery?.length
        ? override.gallery
        : item.gallery;

      const imageUrl = gallery?.[0]?.asset
        ? urlFor(gallery[0]).width(100).url()
        : null;

      return {
        id: item._id,
        title: resolveLang(override?.title || item.title),
        description: resolveLang(override?.description || item.description),
        price: override?.price ?? item.price ?? 0,
        isOverride: !!override,
        imageUrl,
        installationTime: item.installationTime ?? null,
      };
    });

    if (req.method === "POST") {
      const { aktPlusId, title, description, price, gallery } = req.body;

      if (!aktPlusId || !description) {
        return res.status(400).json({ error: "Missing data" });
      }

      const existing = await sanity.fetch(
        `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId && aktPlusId._ref == $aktPlusId][0]{_id}`,
        { resellerId, aktPlusId },
      );

      const multilingualTitle = { [lang]: title };
      const multilingualDescription = { [lang]: description };

      const payload = {
        title: multilingualTitle,
        description: multilingualDescription,
        price,
        ...(gallery ? { gallery } : {}),
      };

      if (existing?._id) {
        await sanity.patch(existing._id).set(payload).commit();
      } else {
        await sanity.create({
          _type: "resellerAktPlusOverride",
          resellerId,
          aktPlusId: { _type: "reference", _ref: aktPlusId },
          ...payload,
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

// pages/api/aktplus-overrides.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity, { urlFor } from "@/lib/sanity";

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // Allow override via query param
  const resellerId = session?.user?.resellerId || req.query.resellerId || null;
  const lang = req.query.lang || "sv";

  try {
    if (req.method === "GET") {
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
        resellerId
          ? sanity.fetch(
              `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId]{
                _id,
                aktPlusId->{_id},
                title,
                description,
                price,
                gallery
              }`,
              { resellerId },
            )
          : Promise.resolve([]),
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

      return res.status(200).json({ aktplus: merged });
    }

    // POST still requires a session
    if (req.method === "POST") {
      if (!session?.user?.resellerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { aktPlusId, title, description, price, assetId } = req.body;

      if (!aktPlusId || !description) {
        return res.status(400).json({ error: "Missing data" });
      }

      let gallery;
      if (assetId) {
        gallery = [
          { _type: "image", asset: { _type: "reference", _ref: assetId } },
        ];
      }

      const multilingualTitle = { [lang]: title };
      const multilingualDescription = {
        [lang]: Array.isArray(description)
          ? description
          : [
              {
                _type: "block",
                style: "normal",
                children: [{ _type: "span", text: description }],
              },
            ],
      };

      const payload = {
        title: multilingualTitle,
        description: multilingualDescription,
        price,
        ...(gallery ? { gallery } : {}),
      };

      const existing = await sanity.fetch(
        `*[_type == "resellerAktPlusOverride" && resellerId == $resellerId && aktPlusId._ref == $aktPlusId][0]{_id}`,
        { resellerId: session.user.resellerId, aktPlusId },
      );

      if (existing?._id) {
        await sanity.patch(existing._id).set(payload).commit();
      } else {
        await sanity.create({
          _type: "resellerAktPlusOverride",
          resellerId: session.user.resellerId,
          aktPlusId: { _type: "reference", _ref: aktPlusId },
          ...payload,
        });
      }

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error("Error in AKTPLUS descriptions:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

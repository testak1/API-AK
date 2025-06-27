// pages/api/update-reseller-settings.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) return res.status(401).json({ error: "Unauthorized" });

  const {
    currency,
    language,
    subscription,
    enableLanguageSwitcher,
    secondaryLanguage,
    promotionPopup,
  } = req.body;

  try {
    const userDoc = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]._id`,
      { resellerId },
    );

    if (!userDoc) {
      return res.status(404).json({ error: "Reseller user not found" });
    }

    await sanity
      .patch(userDoc)
      .set({
        currency,
        language,
        secondaryLanguage,
        enableLanguageSwitcher,
        ...(subscription && {
          subscription: {
            planType: subscription.planType,
            price: subscription.price,
            currency: subscription.currency,
          },
        }),
        ...(promotionPopup && {
          promotionPopup: {
            enabled: promotionPopup.enabled || false,
            title: promotionPopup.title || "",
            message: promotionPopup.message || "",
            fontFamily: promotionPopup.fontFamily || "sans-serif",
            textColor: promotionPopup.textColor || "#000000",
            headingColor: promotionPopup.headingColor || "#000000",
            backgroundColor: promotionPopup.backgroundColor || "#ffffff",
            startDate: promotionPopup.startDate || null,
            endDate: promotionPopup.endDate || null,
            promoImage: promotionPopup.promoImage || null, // ✅ string
          },
        }),
      })
      .commit();

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Update failed:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
}

// pages/api/update-reseller-settings.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";

// Define types for better type safety
interface PromotionPopupSettings {
  enabled?: boolean;
  title?: string;
  message?: string;
  fontFamily?: string;
  textColor?: string;
  headingColor?: string;
  backgroundColor?: string;
  startDate?: string | null;
  endDate?: string | null;
  promoImage?: string | null;
}

interface SubscriptionSettings {
  planType?: string;
  price?: number;
  currency?: string;
}

interface DisplaySettings {
  showAktPlus?: boolean;
  showBrandLogo?: boolean;
  showStageLogo?: boolean;
  showDynoChart?: boolean;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const {
    currency,
    language,
    subscription,
    enableLanguageSwitcher,
    secondaryLanguage,
    promotionPopup,
    hiddenMakes,
    displaySettings,
  } = req.body;

  try {
    // First get the current document to merge updates properly
    const currentSettings = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]`,
      { resellerId },
    );

    if (!currentSettings) {
      return res.status(404).json({ error: "Reseller user not found" });
    }

    // Prepare the update object
    const updates: Record<string, any> = {};

    // Basic settings
    if (currency !== undefined) updates.currency = currency;
    if (language !== undefined) updates.language = language;
    if (secondaryLanguage !== undefined)
      updates.secondaryLanguage = secondaryLanguage;
    if (enableLanguageSwitcher !== undefined)
      updates.enableLanguageSwitcher = enableLanguageSwitcher;

    // Handle hidden makes - only update if provided
    if (hiddenMakes !== undefined) {
      updates.hiddenMakes = Array.isArray(hiddenMakes) ? hiddenMakes : [];
    }

    // Subscription settings
    if (subscription) {
      updates.subscription = {
        planType:
          subscription.planType || currentSettings.subscription?.planType,
        price: subscription.price || currentSettings.subscription?.price,
        currency:
          subscription.currency || currentSettings.subscription?.currency,
      };
    }

    // Promotion popup settings
    if (promotionPopup) {
      updates.promotionPopup = {
        enabled:
          promotionPopup.enabled ??
          currentSettings.promotionPopup?.enabled ??
          false,
        title:
          promotionPopup.title || currentSettings.promotionPopup?.title || "",
        message:
          promotionPopup.message ||
          currentSettings.promotionPopup?.message ||
          "",
        fontFamily:
          promotionPopup.fontFamily ||
          currentSettings.promotionPopup?.fontFamily ||
          "sans-serif",
        textColor:
          promotionPopup.textColor ||
          currentSettings.promotionPopup?.textColor ||
          "#000000",
        headingColor:
          promotionPopup.headingColor ||
          currentSettings.promotionPopup?.headingColor ||
          "#000000",
        backgroundColor:
          promotionPopup.backgroundColor ||
          currentSettings.promotionPopup?.backgroundColor ||
          "#ffffff",
        startDate:
          promotionPopup.startDate ||
          currentSettings.promotionPopup?.startDate ||
          null,
        endDate:
          promotionPopup.endDate ||
          currentSettings.promotionPopup?.endDate ||
          null,
        promoImage:
          promotionPopup.promoImage ||
          currentSettings.promotionPopup?.promoImage ||
          null,
      };
    }

    // Display settings
    if (displaySettings) {
      updates.displaySettings = {
        showAktPlus:
          displaySettings.showAktPlus ??
          currentSettings.displaySettings?.showAktPlus ??
          true,
        showBrandLogo:
          displaySettings.showBrandLogo ??
          currentSettings.displaySettings?.showBrandLogo ??
          true,
        showStageLogo:
          displaySettings.showStageLogo ??
          currentSettings.displaySettings?.showStageLogo ??
          true,
        showDynoChart:
          displaySettings.showDynoChart ??
          currentSettings.displaySettings?.showDynoChart ??
          true,
      };
    }

    // Apply the updates
    await sanity.patch(currentSettings._id).set(updates).commit();

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Update failed:", err);
    return res.status(500).json({
      error: "Failed to update settings",
      details: err.message,
    });
  }
}

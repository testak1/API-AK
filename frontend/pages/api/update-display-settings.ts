// pages/api/update-display-settings.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import sanity from "@/lib/sanity";
import { DisplaySettings } from "@/types/sanity";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  const resellerId = session?.user?.resellerId;

  if (!resellerId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const displaySettings: Partial<DisplaySettings> = req.body;

    // Get the document ID
    const userDoc = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]._id`,
      { resellerId }
    );

    if (!userDoc) {
      return res.status(404).json({ error: "Reseller user not found" });
    }

    // Merge with existing settings (preserve unspecified values)
    const currentSettings = await sanity.fetch(
      `*[_type == "resellerUser" && resellerId == $resellerId][0].displaySettings`,
      { resellerId }
    );

    const updatedSettings: DisplaySettings = {
      showAktPlus: displaySettings.showAktPlus ?? currentSettings?.showAktPlus ?? true,
      showBrandLogo: displaySettings.showBrandLogo ?? currentSettings?.showBrandLogo ?? true,
      showStageLogo: displaySettings.showStageLogo ?? currentSettings?.showStageLogo ?? true,
      showDynoChart: displaySettings.showDynoChart ?? currentSettings?.showDynoChart ?? true,
    };

    await sanity
      .patch(userDoc)
      .set({ displaySettings: updatedSettings })
      .commit();

    res.status(200).json({ success: true, displaySettings: updatedSettings });
  } catch (error) {
    console.error("Error updating display settings:", error);
    res.status(500).json({ error: "Failed to update display settings" });
  }
}
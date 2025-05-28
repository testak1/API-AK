// pages/api/reseller-config.ts
import sanity from "@/lib/sanity";
import { ResellerConfig } from "@/types/sanity";

const defaultDisplaySettings = {
  showAktPlus: true,
  showBrandLogo: true,
  showStageLogo: true,
  showDynoChart: true,
};

const exchangeRates = {
  SEK: 1,
  EUR: 0.1,
  USD: 0.1,
  GBP: 0.08,
};

export default async function handler(req, res) {
  const { resellerId } = req.query;
  if (!resellerId) return res.status(400).json({ error: "Missing resellerId" });

  try {
    const result = await sanity.fetch<Partial<ResellerConfig>>(
      `*[_type == "resellerUser" && resellerId == $resellerId][0]{
        logo,
        currency,
        language,
        displaySettings {
          showAktPlus,
          showBrandLogo,
          showStageLogo,
          showDynoChart
        }
        subscription
      }`,
      { resellerId },
    );

    const response: ResellerConfig = {
      logo: result?.logo ?? null,
      currency: result?.currency ?? "SEK",
      language: result?.language ?? "sv",
      displaySettings: result?.displaySettings ?? defaultDisplaySettings,
      exchangeRates,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching reseller config:", error);
    res.status(500).json({ error: "Failed to fetch reseller config" });
  }
}

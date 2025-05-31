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
        email,
        logo,
        currency,
        language,
        displaySettings {
          showAktPlus,
          showBrandLogo,
          showStageLogo,
          showDynoChart
        },
        subscription,
        contactInfo,
        aktPlusLogo
      }`,
      { resellerId },
    );

    const response: ResellerConfig = {
      email: result?.email,
      logo: result?.logo ?? null,
      currency: result?.currency ?? "SEK",
      language: result?.language ?? "sv",
      displaySettings: result?.displaySettings ?? defaultDisplaySettings,
      exchangeRates,
      subscription: result?.subscription ?? null,
      aktPlusLogo: result?.aktPlusLogo ?? null,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching reseller config:", error);
    res.status(500).json({ error: "Failed to fetch reseller config" });
  }
}
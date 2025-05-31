// pages/api/reseller-config.ts
import sanity from "@/lib/sanity";
import { ResellerConfig } from "@/types/sanity";

const defaultDisplaySettings = {
  showAktPlus: true,
  showBrandLogo: true,
  showStageLogo: true,
  showDynoChart: true,
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
      { resellerId }
    );

    const exchangeRates = await fetchExchangeRates("SEK");

    async function fetchExchangeRates(base: string = "SEK") {
      const response = await fetch(
        `https://api.exchangerate.host/latest?base=${base}`
      );
      const data = await response.json();

      const supportedCurrencies = [
        "SEK",
        "EUR",
        "USD",
        "GBP",
        "THB",
        "JPY",
        "CNY",
        "RUB",
        "TRY",
        "PLN",
        "CZK",
        "HUF",
        "AED",
        "KRW",
        "NOK",
        "DKK",
        "CHF",
        "AUD",
        "CAD",
        "INR",
        "SGD",
        "NZD",
        "ZAR",
        "BRL",
        "MXN",
      ];

      const filteredRates: Record<string, number> = {};
      for (const currency of supportedCurrencies) {
        if (data.rates[currency]) {
          filteredRates[currency] = data.rates[currency];
        }
      }

      filteredRates["SEK"] = 1; // ensure SEK is always included as base
      return filteredRates;
    }

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

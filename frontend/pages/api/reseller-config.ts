import sanity from "@/lib/sanity";
import { ResellerConfig } from "@/types/sanity";

const defaultDisplaySettings = {
  showAktPlus: true,
  showBrandLogo: true,
  showStageLogo: true,
  showDynoChart: true,
};

// ✅ Din statiska kursfunktion här
async function fetchExchangeRates() {
  return {
    SEK: 1,
    EUR: 0.1,
    USD: 0.1,
    GBP: 0.08,
    THB: 3.5,
    JPY: 14.0,
    CNY: 0.68,
    RUB: 8.5,
    TRY: 3.1,
    PLN: 0.42,
    CZK: 2.3,
    HUF: 35.0,
    AED: 0.35,
    KRW: 125.0,
    NOK: 1.0,
    DKK: 0.7,
    CHF: 0.085,
    AUD: 0.14,
    CAD: 0.13,
    INR: 7.8,
    SGD: 0.13,
    NZD: 0.15,
    ZAR: 1.7,
    BRL: 0.5,
    MXN: 1.8,
  };
}

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
        enableLanguageSwitcher,
        secondaryLanguage,
        displaySettings {
          showAktPlus,
          showBrandLogo,
          showStageLogo,
          showDynoChart
        },
        promotionPopup {
          enabled,
          title,
          message,
          fontFamily,
          textColor,
          headingColor,
          backgroundColor,
          startDate,
          endDate,
          promoImage
        }
      },
        subscription,
        contactInfo,
        aktPlusLogo
      }`,
      { resellerId },
    );

    const exchangeRates = await fetchExchangeRates();

    const response: ResellerConfig = {
      email: result?.email ?? "",
      logo: result?.logo ?? null,
      currency: result?.currency ?? "SEK",
      language: result?.language ?? "sv",
      displaySettings: result?.displaySettings ?? defaultDisplaySettings,
      exchangeRates,
      subscription: result?.subscription ?? null,
      aktPlusLogo: result?.aktPlusLogo ?? null,
      enableLanguageSwitcher: result?.enableLanguageSwitcher ?? false,
      secondaryLanguage: result?.secondaryLanguage ?? null,
      promotionPopup: {
        enabled: result?.promotionPopup?.enabled ?? false,
        title: result?.promotionPopup?.title ?? "",
        message: result?.promotionPopup?.message ?? "",
        fontFamily: result?.promotionPopup?.fontFamily ?? "sans-serif",
        textColor: result?.promotionPopup?.textColor ?? "#000000",
        headingColor: result?.promotionPopup?.headingColor ?? "#000000",
        backgroundColor: result?.promotionPopup?.backgroundColor ?? "#ffffff",
        startDate: result?.promotionPopup?.startDate ?? null,
        endDate: result?.promotionPopup?.endDate ?? null,
        promoImage: result?.promotionPopup?.promoImage ?? null,
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching reseller config:", error);
    res.status(500).json({ error: "Failed to fetch reseller config" });
  }
}

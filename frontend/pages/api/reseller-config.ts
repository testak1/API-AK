// pages/api/reseller-config.ts
import sanity from "@/lib/sanity";

export default async function handler(req, res) {
  const { resellerId } = req.query;
  if (!resellerId) return res.status(400).json({ error: "Missing resellerId" });

  const result = await sanity.fetch(
    `*[_type == "resellerUser" && resellerId == $resellerId][0]{ logo, currency, language }`,
    { resellerId },
  );

  // Static exchange rates (SEK is base)
  const exchangeRates = {
    SEK: 1,
    EUR: 0.1,
    USD: 0.095,
  };

  res.status(200).json({
    logo: result?.logo ?? null,
    currency: result?.currency ?? "SEK",
    language: result?.language ?? "sv",
    exchangeRates,
  });
}

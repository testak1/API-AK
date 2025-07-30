// pages/api/scrape/[regnr].ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { regnr } = req.query;

  if (typeof regnr !== "string" || !/^[A-Z0-9]{3,7}$/i.test(regnr)) {
    return res
      .status(400)
      .json({ error: "Ogiltigt registreringsnummer-format." });
  }

  const targetUrl = `https://biluppgifter.se/fordon/${regnr.toUpperCase()}`;
  const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

  try {
    console.log(`[Steg 1] Försöker anropa proxy: ${proxyUrl}`);

    // ----- FÖRBÄTTRING: Mer avancerade headers -----
    // Dessa headers efterliknar en modern webbläsare mycket närmare
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "Accept-Language": "sv-SE,sv;q=0.9",
      Referer: "https://google.com/", // Får det att se ut som vi kommer från en sökning
      DNT: "1", // "Do Not Track"
      "Upgrade-Insecure-Requests": "1",
    };

    const response = await axios.get(proxyUrl, {
      headers,
      // Lägg till en timeout så att förfrågan inte hänger sig för evigt
      timeout: 10000, // 10 sekunder
    });

    console.log(`[Steg 2] Fick svar från proxy med status: ${response.status}`);

    const html = response.data;
    const $ = cheerio.load(html);

    console.log("[Steg 3] Laddat in HTML i Cheerio.");

    const table = $("table.table-bordered");
    if (table.length === 0) {
      console.log("Hittade ingen tabell med klassen 'table-bordered'.");
      return res.status(404).json({
        error: "Kunde inte hitta fordonsinformation på den mottagna sidan.",
      });
    }

    const make = table.find('th:contains("Fabrikat")').next("td").text().trim();
    const model = table.find('th:contains("Modell")').next("td").text().trim();
    const modelYear = table
      .find('th:contains("Fordonsår")')
      .next("td")
      .text()
      .trim();

    console.log(`[Steg 4] Extraherad data: ${make}, ${model}, ${modelYear}`);

    if (!make || !model || !modelYear) {
      return res
        .status(500)
        .json({ error: "Kunde inte tolka all nödvändig fordonsdata." });
    }

    res.status(200).json({
      brand: make,
      model: model,
      year: modelYear,
    });
  } catch (error) {
    console.error("--- Fullständigt fel vid scraping ---");
    if (axios.isAxiosError(error)) {
      console.error("Axios status:", error.response?.status);
      console.error("Axios data:", error.response?.data);
    } else {
      console.error("Oväntat fel:", error);
    }
    res.status(500).json({
      error: "Ett serverfel uppstod. Kontakta support om problemet kvarstår.",
    });
  }
}

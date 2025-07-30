// pages/api/scrape/[regnr].ts
import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import * as cheerio from "cheerio";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const { regnr } = req.query;

  if (typeof regnr !== "string" || regnr.length < 3) {
    return res.status(400).json({ error: "Ogiltigt registreringsnummer." });
  }

  const url = "https://biluppgifter.se/fordon/" + regnr.toUpperCase();

  try {
    // Gör en GET-förfrågan för att hämta sidan
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const table = $("table.table-bordered");
    if (table.length === 0) {
      return res.status(404).json({
        error: "Kunde inte hitta fordon med det registreringsnumret.",
      });
    }

    // Extrahera data genom att leta efter specifika <th>-texter
    const make = table.find('th:contains("Fabrikat")').next("td").text().trim();
    const model = table.find('th:contains("Modell")').next("td").text().trim();
    const modelYear = table
      .find('th:contains("Fordonsår")')
      .next("td")
      .text()
      .trim();
    const enginePower = table
      .find('th:contains("Motoreffekt")')
      .next("td")
      .text()
      .trim();

    if (!make || !model || !modelYear) {
      return res.status(404).json({
        error:
          "Kunde inte extrahera all nödvändig fordonsdata. Sidans struktur kan ha ändrats.",
      });
    }

    // Skicka tillbaka den extraherade datan
    res.status(200).json({
      brand: make,
      model: model,
      year: modelYear,
      power: enginePower, // Extra bonus-data du kan använda
    });
  } catch (error) {
    console.error("Scraping error:", error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.status(404).json({
        error: "Kunde inte hitta fordon med det registreringsnumret.",
      });
    }
    res.status(500).json({
      error: "Ett internt serverfel uppstod vid hämtning av fordonsdata.",
    });
  }
}

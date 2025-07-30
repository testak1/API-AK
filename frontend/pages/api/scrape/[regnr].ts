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
    // --- NYTT & FÖRBÄTTRAT ---
    // Lägg till en User-Agent för att se ut som en vanlig webbläsare (mycket viktigt!)
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7",
    };

    const { data } = await axios.get(url, { headers });
    const $ = cheerio.load(data);

    // --- MER ROBUST SÖKNING ---
    // Leta efter en mer unik container för fordonsinformation
    const vehicleInfoSection = $(
      'h2.text-center:contains("Fordonsinformation")',
    ).parent();

    if (vehicleInfoSection.length === 0) {
      // --- BÄTTRE FELSÖKNING ---
      console.error(
        "Kunde inte hitta 'Fordonsinformation'-sektionen. Sidan kan ha ändrats eller så blockeras vi. HTML-innehåll:",
        $.html(),
      );
      return res.status(404).json({
        error:
          "Kunde inte hitta fordonsinformation på sidan. Prova igen senare.",
      });
    }

    const table = vehicleInfoSection.find("table.table-bordered");

    // Extrahera data
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
      console.error(
        `Misslyckades med att extrahera data. Fabrikat: ${make}, Modell: ${model}, År: ${modelYear}`,
      );
      return res.status(500).json({
        error: "Kunde inte tolka all nödvändig fordonsdata från sidan.",
      });
    }

    res.status(200).json({
      brand: make,
      model: model,
      year: modelYear,
      power: enginePower,
    });
  } catch (error) {
    console.error("Fullständigt fel vid scraping:", error);
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        return res.status(404).json({
          error: "Kunde inte hitta fordon med det registreringsnumret.",
        });
      }
      // Logga statuskoden om det inte är 404
      console.error("Axios felstatus:", error.response?.status);
    }
    res.status(500).json({
      error: "Ett oväntat serverfel uppstod. Kontrollera serverloggarna.",
    });
  }
}

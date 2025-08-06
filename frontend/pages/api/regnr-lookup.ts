// pages/api/regnr-lookup.ts
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { regnr } = req.body;

  if (!regnr || !/^[A-Z]{3}\d{2}[A-Z0-9]{1}$/.test(regnr)) {
    return res.status(400).json({ error: "Invalid registration number" });
  }

  try {
    // HIDDEN: URLs are now server-side only
    const targetUrl = `https://biluppgifter.se/fordon/${regnr}`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;

    const response = await fetch(proxyUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch vehicle data (Status: ${response.status})`,
      );
    }

    const htmlContent = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    // --- Your existing scraping logic ---
    const summarySection = doc.querySelector("section#summary");
    const technicalDataSection = doc.querySelector("section#technical-data");

    if (!summarySection) {
      throw new Error("Could not find vehicle summary");
    }

    const h1 = summarySection.querySelector<HTMLElement>(
      ".bar.summary .info h1",
    );
    const iconGrid = summarySection.querySelector<HTMLElement>("ul.icon-grid");

    if (!h1 || !iconGrid) {
      throw new Error("Could not parse vehicle details");
    }

    const fullName = h1.innerText.trim();
    const brand = fullName.split(" ")[0];
    const model = fullName.substring(brand.length).trim();

    let year: string | null = null;
    let fuel: string | null = null;
    let powerHp: string | null = null;

    iconGrid.querySelectorAll("li").forEach((item) => {
      const label = item
        .querySelector<HTMLElement>("span")
        ?.innerText.trim()
        .toLowerCase();
      const value = item.querySelector<HTMLElement>("em")?.innerText.trim();
      if (label === "modellår") year = value?.match(/\d{4}/)?.[0] || null;
      if (label === "bränsle") fuel = value || null;
      if (label === "hästkrafter") powerHp = value?.match(/(\d+)/)?.[0] || null;
    });

    let engineCm3: string | null = null;
    if (technicalDataSection) {
      technicalDataSection
        .querySelectorAll(".inner ul.list li")
        .forEach((item) => {
          const label = item
            .querySelector<HTMLElement>("span.label")
            ?.innerText.trim()
            .toLowerCase();
          if (label === "motorvolym") {
            const value = item
              .querySelector<HTMLElement>("span.value")
              ?.innerText.trim();
            engineCm3 = value?.match(/(\d+)/)?.[0] || null;
          }
        });
    }

    if (!brand || !model || !year || !fuel || !powerHp || !engineCm3) {
      throw new Error("Incomplete vehicle data");
    }

    // Return cleaned data
    res.status(200).json({
      brand,
      model,
      year,
      fuel,
      powerHp,
      engineCm3,
    });
  } catch (error) {
    console.error("Regnr lookup error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

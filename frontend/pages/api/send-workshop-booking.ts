import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const recipients: Record<string, string> = {
  goteborg: "goteborg@aktuning.se",
  jonkoping: "jonkoping@aktuning.se",
  skane: "malmo@aktuning.se",
  stockholm: "stockholm@aktuning.se",
  orebro: "stockholm@aktuning.se",
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character];
  });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    stationSlug,
    stationName,
    serviceTitle,
    name,
    email,
    phone,
    registrationNumber,
    vehicle,
    preferredDate,
    timePreference,
    message,
    pageUrl,
  } = req.body || {};

  const recipient = recipients[stationSlug];
  if (!recipient) return res.status(400).json({ error: "Okänd verkstad." });

  if (!name || !email || !phone || !preferredDate || !serviceTitle) {
    return res.status(400).json({ error: "Fyll i namn, telefon, e-post och önskat datum." });
  }

  const safe = (value: unknown) => escapeHtml(String(value || "–"));

  try {
    await resend.emails.send({
      from: "AK-TUNING Bokning <info@aktuning.se>",
      to: recipient,
      replyTo: email,
      subject: `BOKNINGSFÖRFRÅGAN – ${serviceTitle} | ${stationName}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:680px;margin:auto;color:#171717">
          <div style="background:#171717;color:#fff;padding:28px 32px">
            <p style="margin:0 0 8px;color:#ff4b4b;font-size:12px;font-weight:bold;letter-spacing:1.5px">NY BOKNINGSFÖRFRÅGAN</p>
            <h1 style="margin:0;font-size:28px">${safe(serviceTitle)}</h1>
            <p style="margin:10px 0 0;color:#d1d1d1">AK-TUNING ${safe(stationName)}</p>
          </div>
          <div style="padding:28px 32px;background:#f5f3ef">
            <h2 style="font-size:16px;margin:0 0 14px">Kunduppgifter</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:7px 0;color:#666;width:38%">Namn</td><td style="padding:7px 0;font-weight:bold">${safe(name)}</td></tr>
              <tr><td style="padding:7px 0;color:#666">Telefon</td><td style="padding:7px 0;font-weight:bold">${safe(phone)}</td></tr>
              <tr><td style="padding:7px 0;color:#666">E-post</td><td style="padding:7px 0"><a href="mailto:${safe(email)}">${safe(email)}</a></td></tr>
            </table>
            <hr style="border:0;border-top:1px solid #ddd;margin:24px 0" />
            <h2 style="font-size:16px;margin:0 0 14px">Bil & önskemål</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px">
              <tr><td style="padding:7px 0;color:#666;width:38%">Registreringsnummer</td><td style="padding:7px 0;font-weight:bold">${safe(registrationNumber)}</td></tr>
              <tr><td style="padding:7px 0;color:#666">Bilmodell</td><td style="padding:7px 0">${safe(vehicle)}</td></tr>
              <tr><td style="padding:7px 0;color:#666">Önskat datum</td><td style="padding:7px 0;font-weight:bold">${safe(preferredDate)}</td></tr>
              <tr><td style="padding:7px 0;color:#666">Tid på dagen</td><td style="padding:7px 0">${safe(timePreference)}</td></tr>
            </table>
            <h2 style="font-size:16px;margin:24px 0 8px">Meddelande</h2>
            <div style="background:#fff;border:1px solid #ddd;padding:14px;line-height:1.5">${safe(message).replace(/\n/g, "<br>")}</div>
            <p style="margin:24px 0 0;font-size:12px;color:#777">Källa: <a href="${safe(pageUrl)}">servicesidan</a></p>
          </div>
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Workshop booking email failed:", error);
    return res.status(500).json({ error: "Kunde inte skicka bokningsförfrågan." });
  }
}

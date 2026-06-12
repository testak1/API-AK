// pages/api/send-contact.ts
import {NextApiRequest, NextApiResponse} from "next";
import {Resend} from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const branchRecipients: Record<string, string> = {
  goteborg: "goteborg@aktuning.se",
  jonkoping: "jonkoping@aktuning.se",
  malmo: "malmo@aktuning.se",
  stockholm: "stockholm@aktuning.se",
  orebro: "stockholm@aktuning.se",
  storvik: "stockholm@aktuning.se",
};

const branchLabels: Record<string, string> = {
  goteborg: "Göteborg",
  jonkoping: "Jönköping",
  malmo: "Malmö",
  stockholm: "Stockholm",
  orebro: "Örebro",
  storvik: "Storvik",
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatMessage = (value: unknown) =>
  escapeHtml(value).replace(/\r?\n/g, "<br />");

const infoRow = (label: string, value: unknown) => `
  <tr>
    <td style="padding:10px 0;color:#64748b;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em;border-bottom:1px solid #e5e7eb;">${label}</td>
    <td style="padding:10px 0;color:#0f172a;font-size:15px;font-weight:700;text-align:right;border-bottom:1px solid #e5e7eb;">${escapeHtml(value || "-")}</td>
  </tr>
`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  const {name, email, tel, message, branch, vehicle, stage, link} = req.body;

  if (!name || !email || !tel || !message || !branch || !vehicle) {
    return res.status(400).json({error: "Alla fält måste fyllas i."});
  }

  const recipientEmail = branchRecipients[branch];

  if (!recipientEmail) {
    return res.status(400).json({error: "Ogiltig anläggning vald."});
  }

  const vehicleTitle = [
    vehicle?.brand,
    vehicle?.model,
    vehicle?.year,
    vehicle?.engine,
  ]
    .filter(Boolean)
    .join(" ");
  const stageLabel = String(stage || "-").toUpperCase();
  const branchLabel = branchLabels[branch] || branch;

  try {
    const response = await resend.emails.send({
      from: "info@aktuning.se",
      to: recipientEmail,
      subject: `Förfrågan ${branchLabel} - ${vehicleTitle} | ${stageLabel}`,
      replyTo: email,
      html: `
        <!doctype html>
        <html>
          <body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;">
              <tr>
                <td align="center">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:760px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;box-shadow:0 16px 50px rgba(15,23,42,.12);">
                    <tr>
                      <td style="background:#07090f;padding:28px 30px;color:#ffffff;">
                        <div style="font-size:11px;font-weight:900;letter-spacing:.22em;text-transform:uppercase;color:#ef4444;">Ny kontaktförfrågan</div>
                        <h1 style="margin:8px 0 0;font-size:26px;line-height:1.2;color:#ffffff;">${escapeHtml(vehicleTitle || "Okänt fordon")}</h1>
                        <div style="margin-top:14px;display:inline-block;background:rgba(239,68,68,.14);border:1px solid rgba(239,68,68,.35);border-radius:999px;padding:7px 12px;color:#fecaca;font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;">${escapeHtml(stageLabel)}</div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding:28px 30px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="vertical-align:top;width:50%;padding-right:18px;">
                              <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Kunduppgifter</h2>
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                ${infoRow("Namn", name)}
                                ${infoRow("E-post", email)}
                                ${infoRow("Telefon", tel)}
                                ${infoRow("Anläggning", branchLabel)}
                              </table>
                            </td>
                            <td style="vertical-align:top;width:50%;padding-left:18px;">
                              <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Fordon</h2>
                              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                                ${infoRow("Märke", vehicle?.brand)}
                                ${infoRow("Modell", vehicle?.model)}
                                ${infoRow("Årsmodell", vehicle?.year)}
                                ${infoRow("Motor", vehicle?.engine)}
                              </table>
                            </td>
                          </tr>
                        </table>

                        <div style="margin-top:26px;">
                          <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Meddelande</h2>
                          <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px;color:#1e293b;font-size:15px;line-height:1.6;">
                            ${formatMessage(message)}
                          </div>
                        </div>

                        ${
                          link
                            ? `<div style="margin-top:24px;text-align:center;"><a href="${escapeHtml(link)}" target="_blank" style="display:inline-block;background:#dc2626;color:#ffffff;text-decoration:none;border-radius:10px;padding:13px 20px;font-size:13px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;">Öppna bilens sida</a></div>`
                            : ""
                        }
                      </td>
                    </tr>

                    <tr>
                      <td style="background:#07090f;padding:22px 30px;text-align:center;">
                        <img src="https://api.aktuning.se/ak-logo.png" width="90" height="90" alt="AK-TUNING" style="display:block;margin:0 auto 10px;" />
                        <div style="color:#cbd5e1;font-size:12px;font-weight:800;letter-spacing:.12em;">WWW.AKTUNING.SE</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return res.status(200).json({result: response});
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({error: "Failed to send email"});
  }
}

import { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";


const resend = new Resend(process.env.RESEND_API_KEY);



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    name,
    email,
    phone,
    message,
    resellerId,
    vehicleInfo,
    stageOrOption,
  } = req.body;

  try {
    // First get reseller's email - use relative path since we're in the same app
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      (process.env.NODE_ENV === "development" ? "http://localhost:3000" : "");

    const resellerResponse = await fetch(
      `${baseUrl}/api/reseller-config?resellerId=${resellerId}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!resellerResponse.ok) {
      throw new Error("Failed to fetch reseller data");
    }

    const resellerData = await resellerResponse.json();

    if (!resellerData.email) {
      throw new Error("Reseller email not found");
    }

    // Send email to reseller
    await resend.emails.send({
      from: "no-reply@aktuning.se",
      to: resellerData.email,
      subject: `🚗 NEW Tuning Request - ${vehicleInfo.brand} ${vehicleInfo.model} ${vehicleInfo.year} ${vehicleInfo.engine} | ${stageOrOption.replace("Steg", "STAGE").toUpperCase()}`,
      html: `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #1a365d;">🔥 New Tuning Request Received!</h2>
    
    <h3 style="color: #2d3748;">🚘 Vehicle Details</h3>
    <ul style="list-style: none; padding: 0;">
      <li><strong>🏷️ Brand:</strong> ${vehicleInfo.brand}</li>
      <li><strong>📍 Model:</strong> ${vehicleInfo.model}</li>
      <li><strong>📆 Year:</strong> ${vehicleInfo.year}</li>
      <li><strong>⚙️ Engine:</strong> ${vehicleInfo.engine}</li>
      ${stageOrOption ? `<li><strong>🚀 Stage/Option:</strong> ${stageOrOption.replace("Steg", "STAGE").toUpperCase()}</li>` : ""}
    </ul>

    <h3 style="color: #2d3748; margin-top: 20px;">🙋 Customer Details</h3>
    <ul style="list-style: none; padding: 0;">
      <li><strong>👤 Name:</strong> ${name}</li>
      <li><strong>✉️ Email:</strong> ${email}</li>
      <li><strong>📞 Phone:</strong> ${phone}</li>
    </ul>
    
    <h3 style="color: #2d3748; margin-top: 20px;">📝 Message</h3>
    <p style="background: #f7fafc; padding: 10px; border-radius: 4px;">
      ${message.replace(/\n/g, "<br>")}
    </p>
    
    <p style="margin-top: 30px; color: #718096;">
      📩 This request was submitted through the AK-Tuning portal.
    </p>
  </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error sending contact request:", error);
    return res.status(500).json({
      error: "Failed to send contact request",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

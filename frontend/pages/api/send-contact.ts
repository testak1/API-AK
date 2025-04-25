// pages/api/send-contact.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, tel, message, branch, vehicle, stage } = req.body;

  if (!name || !email || !tel || !message || !branch || !vehicle) {
    return res.status(400).json({ error: 'Alla fält måste fyllas i.' });
  }

  let recipientEmail = '';
  switch (branch.toLowerCase()) {
    case 'TEST-AK':
      recipientEmail = 'info@aktuning.se';
      break;
    case 'stockholm':
    case 'orebro':
    case 'storvik':
      recipientEmail = 'stockholm@aktuning.se';
      break;
    case 'goteborg':
      recipientEmail = 'goteborg@aktuning.se';
      break;
    case 'malmo':
      recipientEmail = 'malmo@aktuning.se';
      break;
    case 'jonkoping':
      recipientEmail = 'jonkoping@aktuning.se';
      break;
    default:
      return res.status(400).json({ error: 'Ogiltig anläggning vald.' });
  }

  try {
    const response = await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: recipientEmail,
      subject: 'Ny förfrågan från hemsidan',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #222;">
          <h2 style="color: #333;">📬 Ny förfrågan från hemsidan</h2>

          <table cellpadding="8">
            <tr><td><strong>Namn:</strong></td><td>${name}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Telefon:</strong></td><td>${tel}</td></tr>
            <tr><td><strong>Filial:</strong></td><td>${branch}</td></tr>
            <tr><td><strong>Stage / AKTPLUS:</strong></td><td>${stage || '-'}</td></tr>
            <tr><td><strong>Meddelande:</strong></td><td>${message}</td></tr>
          </table>

          <h3 style="margin-top: 30px;">🚗 Fordon</h3>
          <table cellpadding="8">
            <tr><td><strong>Märke:</strong></td><td>${vehicle?.brand || '-'}</td></tr>
            <tr><td><strong>Modell:</strong></td><td>${vehicle?.model || '-'}</td></tr>
            <tr><td><strong>År:</strong></td><td>${vehicle?.year || '-'}</td></tr>
            <tr><td><strong>Motor:</strong></td><td>${vehicle?.engine || '-'}</td></tr>
          </table>

          <p style="margin-top: 30px; font-size: 0.9em; color: #888;">Skickad automatiskt via AKTuning.se</p>
        </div>
      `,
    });

    return res.status(200).json({ result: response });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

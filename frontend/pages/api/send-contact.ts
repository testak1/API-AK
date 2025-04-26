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
  switch (branch) {
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
      from: 'info@aktuning.se',
      to: recipientEmail,
      subject: `FÖRFRÅGAN - ${vehicle?.brand || ''} ${vehicle?.model || ''} ${vehicle?.year || ''} ${vehicle?.engine || ''} / ${stage || '-'}`,
      replyTo: email,
html: `
  <div style="font-family: 'Segoe UI', Tahoma, sans-serif; background: #f4f4f4; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
      <div style="background: #1f2937; color: white; padding: 20px;">
        <h2 style="margin: 0;">📬 FÖRFRÅGAN</h2>
      </div>

      <div style="padding: 20px; color: #111;">
        <h3 style="margin-bottom: 10px;">🔹 FÖRFRÅGAN</h3>
        <table cellpadding="8" cellspacing="0" style="width: 100%;">
          <tr><td><strong>NAMN:</strong></td><td>${name}</td></tr>
          <tr><td><strong>EMAIL:</strong></td><td>${email}</td></tr>
          <tr><td><strong>TELNR:</strong></td><td>${tel}</td></tr>
        </table>

        <h3 style="margin-top: 30px; margin-bottom: 10px;">🚗 FORDON</h3>
        <table cellpadding="8" cellspacing="0" style="width: 100%;">
          <tr><td><strong>MÄRKE:</strong></td><td>${vehicle?.brand || '-'}</td></tr>
          <tr><td><strong>MODELL:</strong></td><td>${vehicle?.model || '-'}</td></tr>
          <tr><td><strong>VARIANT:</strong></td><td>${vehicle?.year || '-'}</td></tr>
          <tr><td><strong>MOTOR:</strong></td><td>${vehicle?.engine || '-'}</td></tr>
          <tr><td><strong>VAL:</strong></td><td><span style="color: #059669;"><strong>${stage || '-'}</strong></span></td></tr>
        </table>

        <h3 style="margin-top: 30px; margin-bottom: 10px;">💬 MEDDELANDE</h3>
        <div style="padding: 10px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 5px;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>

      <div style="background: #1f2937; color: #9ca3af; text-align: center; padding: 10px; font-size: 12px;">
        Mejlet skickades automatiskt via <strong>AKTuning.se</strong>
      </div>
    </div>
  </div>
`        </div>
      `,
    });

    return res.status(200).json({ result: response });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

import { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, tel, message, branch, vehicle } = req.body;

  if (!name || !email || !tel || !message || !branch) {
    return res.status(400).json({ error: 'Alla fält måste fyllas i.' });
  }

  let recipientEmail = '';

  switch (branch) {
    case 'TEST-AK':
      recipientEmail = 'info@aktuning.se';
      break;
    case 'Stockholm':
      recipientEmail = 'stockholm@aktuning.se';
      break;
    case 'Göteborg':
      recipientEmail = 'goteborg@aktuning.se';
      break;
    case 'Malmö':
      recipientEmail = 'malmo@aktuning.se';
      break;
    case 'Jönköping':
      recipientEmail = 'jonkoping@aktuning.se';
      break;
    case 'Örebro':
      recipientEmail = 'stockholm@aktuning.se';
      break;
    case 'Storvik':
      recipientEmail = 'stockholm@aktuning.se';
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
        <h2>Ny förfrågan</h2>
        <p><strong>Namn:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Telefon:</strong> ${tel}</p>
        <p><strong>Filial:</strong> ${branch}</p>
        <p><strong>Meddelande:</strong><br/>${message}</p>
        <h3>Fordon</h3>
        <p><strong>Märke:</strong> ${vehicle.brand}</p>
        <p><strong>Modell:</strong> ${vehicle.model}</p>
        <p><strong>År:</strong> ${vehicle.year}</p>
        <p><strong>Motor:</strong> ${vehicle.engine}</p>
      `,
    });

    return res.status(200).json({ result: response });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}

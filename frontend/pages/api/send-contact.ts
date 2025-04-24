// Dummy endpoint for POST request
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // Here, normally handle sending the email
    return res.status(200).json({ message: 'Contact request received' });
  }
  return res.status(405).json({ message: 'Method Not Allowed' });
}
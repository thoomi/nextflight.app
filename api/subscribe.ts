import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

// Expected env vars:
// - RESEND_API_KEY: API key from Resend
// - TO_EMAIL: recipient (e.g., hello@nextflightbetter.app)
// - FROM_EMAIL: verified sender (e.g., "NextFlight <no-reply@nextflightbetter.app>")

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const { email } = req.body || {};
    if (typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ ok: false, error: 'Invalid email' });
    }

    if (!process.env.TO_EMAIL || !process.env.FROM_EMAIL) {
      return res.status(500).json({ ok: false, error: 'Email not configured' });
    }

    const subject = 'New early access request';
    const html = `
      <div>
        <p>New signup for NextFlight early access.</p>
        <p><strong>Email:</strong> ${email}</p>
      </div>
    `;

    const { error } = await resend.emails.send({
      to: process.env.TO_EMAIL,
      from: process.env.FROM_EMAIL,
      subject,
      html,
    });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message || 'Send failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || 'Server error' });
  }
}



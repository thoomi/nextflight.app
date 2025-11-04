import { Resend } from 'resend';
import { z } from 'zod';

const envConfig = (() => {
  const schema = z.object({
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    TO_EMAIL: z.string().min(1, 'TO_EMAIL is required'),
    FROM_EMAIL: z.string().min(1, 'FROM_EMAIL is required'),
  });

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const message = parsed.error.errors.map((error) => error.message).join('; ');
    throw new Error(`Subscribe handler misconfigured: ${message}`);
  }

  return parsed.data;
})();

const resend = new Resend(envConfig.RESEND_API_KEY);

const requestSchema = z.object({
  email: z.string().trim().email('Invalid email'),
});

const subject = 'New early access request';

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);

const composeEmail = (email: string) => `
  <div>
    <p>New signup for NextFlight early access.</p>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
  </div>
`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  const payload =
    typeof req.body === 'string'
      ? (() => {
          try {
            return JSON.parse(req.body);
          } catch {
            return undefined;
          }
        })()
      : req.body;

  const parsedPayload = requestSchema.safeParse(payload);
  if (!parsedPayload.success) {
    return res.status(400).json({ ok: false, error: 'Invalid email' });
  }

  try {
    const { email } = parsedPayload.data;

    const { error } = await resend.emails.send({
      to: envConfig.TO_EMAIL,
      from: envConfig.FROM_EMAIL,
      subject,
      html: composeEmail(email),
    });

    if (error) {
      throw new Error(error.message || 'Send failed');
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Early access subscription failed', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

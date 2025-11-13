import { Resend } from 'resend';
import { z } from 'zod';

const envConfig = (() => {
  const schema = z.object({
    RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
    RESEND_AUDIENCE_ID: z.string().min(1, 'RESEND_AUDIENCE_ID is required'),
    NOTIFICATION_EMAIL: z.string().email('NOTIFICATION_EMAIL must be valid').optional(),
    FROM_EMAIL: z.string().email('FROM_EMAIL must be valid').optional(),
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

const escapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => escapeMap[char] ?? char);

const composeNotificationEmail = (email: string, contactId?: string) => `
  <div style="font-family: sans-serif;">
    <h2>New NextFlight Early Access Signup</h2>
    <p><strong>Email:</strong> ${escapeHtml(email)}</p>
    ${contactId ? `<p><strong>Contact ID:</strong> ${escapeHtml(contactId)}</p>` : ''}
    <p><strong>Time:</strong> ${new Date().toISOString()}</p>
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

    // Add contact to Resend audience (primary action)
    const { data, error: audienceError } = await resend.contacts.create({
      email,
      audienceId: envConfig.RESEND_AUDIENCE_ID,
      unsubscribed: false,
    });

    if (audienceError) {
      // Handle duplicate email gracefully (user already subscribed)
      if (audienceError.message?.includes('already exists')) {
        return res.status(200).json({ ok: true, message: 'Already subscribed' });
      }
      throw new Error(audienceError.message || 'Failed to add contact to audience');
    }

    // Send optional notification email if configured
    if (envConfig.NOTIFICATION_EMAIL && envConfig.FROM_EMAIL) {
      try {
        await resend.emails.send({
          from: envConfig.FROM_EMAIL,
          to: envConfig.NOTIFICATION_EMAIL,
          subject: 'New NextFlight Early Access Signup',
          html: composeNotificationEmail(email, data?.id),
        });
      } catch (emailError) {
        // Don't fail the request if notification email fails
        console.error('Failed to send notification email:', emailError);
      }
    }

    return res.status(200).json({ ok: true, contactId: data?.id });
  } catch (err) {
    console.error('Early access subscription failed', err);
    return res.status(500).json({ ok: false, error: 'Server error' });
  }
}

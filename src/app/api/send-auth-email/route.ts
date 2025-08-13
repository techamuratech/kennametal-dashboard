import nodemailer from 'nodemailer';

// Only allow POST
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, firstName, lastName } = body as { to: string; firstName?: string; lastName?: string };

    if (!to) {
      return new Response(JSON.stringify({ error: 'Missing required field: to' }), { status: 400 });
    }

    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.MAIL_FROM || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      return new Response(JSON.stringify({ error: 'SMTP settings are not configured on the server' }), { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: { user: smtpUser, pass: smtpPass },
    });

    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim();

    const subject = 'Your account has been authenticated';
    const text = `Hello ${displayName || ''}\n\nYour Kennametal app account has been authenticated. You can now sign in and use all available features.\n\nIf you did not request this, please contact support.`;

    const html = `
      <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <h2 style="color:#111827;">Your account is authenticated</h2>
        <p>Hello ${displayName || ''},</p>
        <p>Your Kennametal app account has been authenticated. You can now sign in and use all available features.</p>
        <p style="margin-top:24px; color:#6B7280; font-size: 12px;">If you did not request this, please contact support.</p>
      </div>`;

    await transporter.sendMail({
      from: fromEmail,
      to,
      subject,
      text,
      html,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (err: any) {
    console.error('send-auth-email error', err);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
  }
}
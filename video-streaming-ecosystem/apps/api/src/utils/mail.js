import nodemailer from 'nodemailer';

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  const transporter = createTransport();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your LumenStream password',
    text: `Hi ${name || ''},\n\nReset your password:\n${resetUrl}\n\nThis link expires in 1 hour.\n`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto">
        <h2 style="color:#6D28D9">LumenStream</h2>
        <p>Hi ${name || 'there'},</p>
        <p>Click the button below to reset your password. Link expires in 1 hour.</p>
        <p>
          <a href="${resetUrl}"
             style="display:inline-block;background:#7C3AED;color:#fff;padding:12px 18px;border-radius:12px;text-decoration:none;font-weight:600">
            Reset Password
          </a>
        </p>
        <p style="color:#6b7280;font-size:12px">If you didn't request this, ignore this email.</p>
      </div>
    `,
  });
}

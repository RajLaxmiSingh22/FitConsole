import nodemailer from "nodemailer";

let transporter;

// Reads SMTP settings from the environment; returns null when email is not configured.
export function getEmailConfiguration(environment = process.env) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM } = environment;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !EMAIL_FROM) return null;
  const port = Number(SMTP_PORT ?? 465);
  return {
    host: SMTP_HOST,
    port,
    // Port 465 uses TLS from the start; 587 upgrades with STARTTLS.
    secure: port === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    from: EMAIL_FROM,
  };
}

export function isEmailConfigured() {
  return Boolean(getEmailConfiguration());
}

function getTransporter(configuration) {
  transporter ??= nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    auth: configuration.auth,
  });
  return transporter;
}

// Sends one message built by a template in emailTemplates.js. Throws when email is not configured or delivery fails.
export async function sendEmail(to, { subject, text, html }, { transport } = {}) {
  const configuration = getEmailConfiguration();
  if (!configuration) throw new Error("Email is not configured.");
  return (transport ?? getTransporter(configuration)).sendMail({ from: configuration.from, to, subject, text, html });
}

// For notifications that must never block or fail the request that triggered them.
export function sendEmailInBackground(to, message, label) {
  if (!isEmailConfigured()) return;
  sendEmail(to, message).catch((error) => {
    // Never log the recipient or message body; they are personal data.
    console.error(`${label} email was not delivered:`, error.message);
  });
}

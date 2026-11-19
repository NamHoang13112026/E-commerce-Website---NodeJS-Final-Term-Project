const nodemailer = require('nodemailer');

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
}

// Without SMTP settings the email is printed to the server log (useful in development)
async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || 'TechParts <no-reply@techparts.local>';
  if (!transporter) {
    console.log(`\n[MAIL - SMTP not configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    return;
  }
  await transporter.sendMail({ from, to, subject, html, text });
}

module.exports = { sendMail };

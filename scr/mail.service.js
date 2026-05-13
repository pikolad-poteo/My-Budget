const nodemailer = require('nodemailer');

function getAppUrl() {
  return (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}

function getMailConfig() {
  const host = process.env.MAIL_HOST;
  const user = process.env.MAIL_USER;
  const password = process.env.MAIL_PASSWORD;

  if (!host || !user || !password) {
    return null;
  }

  return {
    host,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || 'false') === 'true',
    auth: {
      user,
      pass: password
    }
  };
}

function createTransporter() {
  const config = getMailConfig();

  if (!config) {
    throw new Error('Email sending is not configured. Check MAIL_HOST, MAIL_USER and MAIL_PASSWORD in .env.');
  }

  return nodemailer.createTransport(config);
}

async function sendMail({ to, subject, text, html }) {
  const transporter = createTransporter();
  const from = process.env.MAIL_FROM || process.env.MAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html
  });
}

async function sendVerificationEmail(email, token) {
  const verificationUrl = `${getAppUrl()}/verify-email/${token}`;

  await sendMail({
    to: email,
    subject: 'Verify your My Budget email',
    text: `Please verify your My Budget account by opening this link: ${verificationUrl}\n\nThis link is valid for 24 hours.`,
    html: `
      <p>Please verify your My Budget account by opening this link:</p>
      <p><a href="${verificationUrl}">${verificationUrl}</a></p>
      <p>This link is valid for 24 hours.</p>
    `
  });
}

async function sendPasswordResetEmail(email, token) {
  const resetUrl = `${getAppUrl()}/reset-password/${token}`;

  await sendMail({
    to: email,
    subject: 'Reset your My Budget password',
    text: `You can reset your My Budget password by opening this link: ${resetUrl}\n\nThis link is valid for 30 minutes.`,
    html: `
      <p>You can reset your My Budget password by opening this link:</p>
      <p><a href="${resetUrl}">${resetUrl}</a></p>
      <p>This link is valid for 30 minutes.</p>
    `
  });
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail
};

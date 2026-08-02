const nodemailer = require('nodemailer');

// Single SMTP transport. Swap for SendGrid/SES/Postmark in production by
// changing only this file — nothing else in the app should know about the
// email provider.
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendEmail({ to, subject, html, text }) {
  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}

function verificationEmail(code) {
  return {
    subject: 'Verify your Raabta account',
    text: `Your Raabta verification code is ${code}. It expires in 30 minutes.`,
    html: `<p>Your Raabta verification code is:</p><h2>${code}</h2><p>This code expires in 30 minutes.</p>`,
  };
}

function passwordResetEmail(rawToken, clientUrl) {
  const link = `${clientUrl}/reset-password?token=${rawToken}`;
  return {
    subject: 'Reset your Raabta password',
    text: `Reset your password: ${link} (expires in 30 minutes). If you did not request this, ignore this email.`,
    html: `<p>Click below to reset your Raabta password (expires in 30 minutes):</p><p><a href="${link}">${link}</a></p><p>If you did not request this, you can safely ignore this email.</p>`,
  };
}

function otpEmail(code) {
  return {
    subject: 'Your Raabta login code',
    text: `Your one-time login code is ${code}. It expires in 5 minutes.`,
    html: `<p>Your one-time login code is:</p><h2>${code}</h2><p>This code expires in 5 minutes.</p>`,
  };
}

module.exports = { sendEmail, verificationEmail, passwordResetEmail, otpEmail };

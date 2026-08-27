// config/email.js
import nodemailer from 'nodemailer';

const DEFAULT_EMAIL_HOST = 'smtp.gmail.com';
const DEFAULT_EMAIL_PORT = 587;
const DEFAULT_SENDER_NAME = 'Admissions Registry';

const getSenderAddress = () => {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.EMAIL_USER) return `"${DEFAULT_SENDER_NAME}" <${process.env.EMAIL_USER}>`;
  return `"${DEFAULT_SENDER_NAME}" <noreply@example.com>`;
};


const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').trim();
const getEmailConfig = () => {
  const config = {
    host: process.env.EMAIL_HOST || DEFAULT_EMAIL_HOST,
    port: Number.parseInt(process.env.EMAIL_PORT || String(DEFAULT_EMAIL_PORT), 10) || DEFAULT_EMAIL_PORT,
    secure: false,
  };

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (emailUser && emailPass) {
    return {
      ...config,
      auth: {
        user: emailUser,
        pass: emailPass,
      },
    };
  }

  return config;
};

export const transporter = nodemailer.createTransport(getEmailConfig());

export const verifyEmailConnection = async () => {
  try {
    await transporter.verify();
    console.log('Email service is ready');
    return true;
  } catch (error) {
    console.error('Email service error:', error?.message || error);
    return false;
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const mailOptions = {
      from: getSenderAddress(),
      to,
      subject,
      html,
      text: text || stripHtml(html),
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error?.message || 'Unknown email error';
    console.error('Email send error:', message);
    return { success: false, error: message };
  }
};

export const sendTestEmail = async (to) => {
  return sendEmail({
    to,
    subject: 'Test Email - Admissions Registry',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a2e;">Test Email</h1>
        <p>This is a test email from Admissions Registry.</p>
        <p>Your email configuration is working correctly!</p>
        <hr style="border: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">
          Sent from: ${process.env.EMAIL_USER || 'Admissions Registry'}<br>
          Environment: ${process.env.NODE_ENV || 'development'}
        </p>
      </div>
    `,
    text: 'This is a test email from Admissions Registry. Your email configuration is working correctly!',
  });
};

export default {
  transporter,
  verifyEmailConnection,
  sendEmail,
  sendTestEmail,
};
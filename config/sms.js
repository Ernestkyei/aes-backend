// config/sms.js
import twilio from 'twilio';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

const formatPhoneNumber = (to = '') => {
  const trimmed = String(to).trim().replace(/\s+/g, '');

  if (!trimmed) {
    throw new Error('Phone number is required');
  }

  if (!trimmed.startsWith('+')) {
    const normalized = trimmed.startsWith('0') ? trimmed.slice(1) : trimmed;
    return `+233${normalized}`;
  }

  return trimmed;
};

export const sendSMS = async ({ to, message }) => {
  try {
    const formattedNumber = formatPhoneNumber(to);

    if (formattedNumber.length < 10) {
      throw new Error('Invalid phone number format');
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: formattedNumber,
    });

    console.log(`SMS sent to ${to}: ${result.sid}`);
    return { success: true, sid: result.sid };
  } catch (error) {
    const message = error?.message || 'Unknown SMS error';
    console.error('SMS send error:', message);
    return { success: false, error: message };
  }
};

export const sendBulkSMS = async ({ recipients, message }) => {
  const results = [];

  for (const recipient of recipients) {
    results.push({ recipient, ...(await sendSMS({ to: recipient, message })) });
  }

  return results;
};

export const verifySMS = async () => {
  try {
    await twilioClient.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    console.log('SMS service is ready');
    console.log(`Twilio phone: ${TWILIO_PHONE_NUMBER}`);
    return true;
  } catch (error) {
    const message = error?.message || 'Unknown SMS verification error';
    console.error('SMS service error:', message);
    return false;
  }
};

export default {
  sendSMS,
  sendBulkSMS,
  verifySMS,
  twilioClient,
};
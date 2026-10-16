// config/paystack.js
import axios from 'axios';

const getSecretKey = () => process.env.PAYSTACK_SECRET_KEY;

// Initialize payment
// callbackPath: where Paystack sends the user after paying (default: subscription page)
export const initializePayment = async (
  email,
  amount,
  metadata = {},
  callbackPath = '/subscription'
) => {
  try {
    const applicantUrl = (process.env.APPLICANT_FRONTEND_URL || '').replace(/\/+$/, '');

    if (!applicantUrl) {
      throw new Error('APPLICANT_FRONTEND_URL is not set in the backend .env');
    }

    const callbackUrl = `${applicantUrl}${callbackPath}`;

    console.log('PAYSTACK CALLBACK URL:', callbackUrl);

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email,
        amount: Math.round(amount * 100), // smallest currency unit (pesewas)
        currency: 'GHS',
        callback_url: callbackUrl,
        metadata,
      },
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'Paystack initialization error:',
      error.response?.data || error.message
    );
    throw error;
  }
};

// Verify payment
export const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${getSecretKey()}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error(
      'Paystack verification error:',
      error.response?.data || error.message
    );
    throw error;
  }
};

export default {
  initializePayment,
  verifyPayment,
};
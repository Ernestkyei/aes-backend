// backend/src/controllers/paymentController.js

import {
  getMyPayments as getMyPaymentsService,
  getPaymentById as getPaymentByIdService,
  getPaymentsByUser as getPaymentsByUserService,
  getPaymentStats as getPaymentStatsService,
  getAdminPayments as getAdminPaymentsService,
  handleFailedPayment,
  handlePendingPayment,
  handleSuccessfulPayment,
  initializePayment as initializePaymentService,
  verifyPayment as verifyPaymentService,
} from '../services/paymentService.js';

// ============================================================
// INITIALIZE PAYMENT
// ============================================================
export const initializePaymentRequest = async (req, res) => {
  try {
    const { email, amount, subscriptionId } = req.body;
    const userId = req.user.id;

    if (!email || !amount || !subscriptionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, amount, and subscriptionId are required',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0',
      });
    }

    const metadata = { userId, subscriptionId, email };
    const result = await initializePaymentService(email, amount, metadata);

    if (result.status) {
      return res.status(200).json({
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorization_url: result.data.authorization_url,
          access_code: result.data.access_code,
          reference: result.data.reference,
        },
      });
    }

    return res.status(400).json({
      success: false,
      message: result.message || 'Payment initialization failed',
    });
  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment initialization failed',
    });
  }
};

// ============================================================
// VERIFY PAYMENT

// ============================================================
export const verifyPaymentRequest = async (req, res) => {
  try {
    const { reference } = req.query;

    if (!reference) {
      return res.status(400).json({
        success: false,
        message: 'Reference is required',
      });
    }

    const result = await verifyPaymentService(reference);

    if (result.status && result.data.status === 'success') {
      return res.status(200).json({
        success: true,
        message: 'Payment verified successfully',
        data: result.data,
      });
    }

    return res.status(400).json({
      success: false,
      message: result.message || 'Payment verification failed',
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Payment verification failed',
    });
  }
};

// ============================================================
// PAYSTACK WEBHOOK

// ============================================================
export const webhook = async (req, res) => {
  try {
    const event = req.body;

    console.log('📦 Webhook received:', event.event);

    switch (event.event) {
      case 'charge.success':
        console.log('Charge successful:', event.data.reference);
        await handleSuccessfulPayment(event.data);
        break;

      case 'charge.failed':
        console.log('Charge failed:', event.data.reference);
        await handleFailedPayment(event.data);
        break;

      case 'charge.pending':
        console.log('⏳ Charge pending:', event.data.reference);
        await handlePendingPayment(event.data);
        break;

      default:
        console.log('Unhandled event:', event.event);
    }

    // Always respond with 200 OK (Paystack expects this)
    return res.status(200).json({ status: 'success' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(200).json({ status: 'success' });
  }
};

// ============================================================
// GET ALL PAYMENTS (ADMIN ONLY)

// ============================================================
export const getAllPayments = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, startDate, endDate } = req.query;

    const result = await getAdminPaymentsService(
      parseInt(page),
      parseInt(limit),
      { status, startDate, endDate }
    );

    return res.status(200).json({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payments',
    });
  }
};

// ============================================================
// GET PAYMENT STATISTICS (ADMIN ONLY)
// GET /api/v1/payments/admin/stats
// ============================================================
export const getPaymentStats = async (req, res) => {
  try {
    const stats = await getPaymentStatsService();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment statistics',
    });
  }
};

// ============================================================
// GET PAYMENT BY ID (ADMIN ONLY)
// GET /api/v1/payments/admin/:id
// ============================================================
export const getPaymentById = async (req, res) => {
  try {
    const { id } = req.params;

    const payment = await getPaymentByIdService(id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Error fetching payment:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch payment',
    });
  }
};

// ============================================================
// GET PAYMENTS BY USER (ADMIN ONLY)
// GET /api/v1/payments/admin/user/:userId
// ============================================================
export const getPaymentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await getPaymentsByUserService(userId);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching user payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch user payments',
    });
  }
};

// ============================================================
// GET MY PAYMENTS (APPLICANT)
// GET /api/v1/payments/my-payments
// ============================================================
export const getMyPayments = async (req, res) => {
  try {
    const userId = req.user.id;

    const payments = await getMyPaymentsService(userId);

    return res.status(200).json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error('Error fetching my payments:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch your payments',
    });
  }
};
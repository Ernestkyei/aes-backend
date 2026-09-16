import {
  createSubscription,
  getSubscriptionById,
  getSubscriptionByUserId,
} from "../services/subscriptionService.js";
import { initializePayment } from "../services/paymentService.js";


// ======================================================
// CREATE SUBSCRIPTION
// ======================================================

export const createSubscriptionController = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      nationality,
      email,
      phoneNumber,
      address,
      city,
      country,
      paymentMethod,
      momoNetwork,
      type,
    } = req.body;

    // Validate required fields
    if (
      !firstName ||
      !lastName ||
      !dateOfBirth ||
      !gender ||
      !nationality ||
      !email ||
      !phoneNumber ||
      !address ||
      !city ||
      !country ||
      !type
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Create applicant, application and subscription
    const result = await createSubscription({
      firstName,
      lastName,
      dateOfBirth,
      gender,
      nationality,
      email,
      phoneNumber,
      address,
      city,
      country,
      paymentMethod,
      momoNetwork,
      type,
    });

    // Initialize Paystack payment
    const payment = await initializePayment(
      email,
      result.subscription.amount,
      {
        userId: result.user.id,
        subscriptionId: result.subscription.id,
        type: result.subscription.type,
        paymentMethod,
        momoNetwork,
      }
    );

    if (!payment.status) {
      return res.status(400).json({
        success: false,
        message: "Unable to initialize payment",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Subscription created successfully",
      data: {
        user: result.user,
        application: result.application,
        subscription: result.subscription,
        payment: {
          authorizationUrl: payment.data.authorization_url,
          accessCode: payment.data.access_code,
          reference: payment.data.reference,
        },
      },
    });

  } catch (error) {
    console.error("Create subscription controller error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "An error occurred while creating subscription",
    });
  }
};


// ======================================================
// GET SUBSCRIPTION BY ID
// ======================================================

export const getSubscription = async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await getSubscriptionById(id);

    return res.status(200).json({
      success: true,
      subscription,
    });

  } catch (error) {
    console.error("Get subscription controller error:", error);

    return res.status(404).json({
      success: false,
      message: error.message || "Subscription not found",
    });
  }
};


// ======================================================
// GET SUBSCRIPTION BY USER
// ======================================================

export const getMySubscription = async (req, res) => {
  try {
    const userId = req.user.id;

    const subscription = await getSubscriptionByUserId(userId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        message: "Subscription not found",
      });
    }

    return res.status(200).json({
      success: true,
      subscription,
    });

  } catch (error) {
    console.error("Get my subscription controller error:", error);

    return res.status(500).json({
      success: false,
      message: "An error occurred while getting subscription",
    });
  }
};
import prisma from "../config/database.js";

const PACKAGE_PRICES = {
  UNDERGRAD: 200,
  POSTGRAD: 300,
  INTERNATIONAL: 400,
};

export const createSubscription = async ({
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
}) => {
  try {
    // Validate subscription type
    const amount = PACKAGE_PRICES[type];

    if (!amount) {
      throw new Error("Invalid subscription type");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if applicant already exists
    let user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Prevent an existing applicant from creating another subscription
    if (user) {
      const existingSubscription =
        await prisma.subscription.findUnique({
          where: {
            userId: user.id,
          },
        });

      if (existingSubscription) {
        throw new Error("User already has a subscription");
      }
    }

    // Create user, application and subscription together
    const result = await prisma.$transaction(async (tx) => {
      // Create applicant user if they don't exist
      if (!user) {
        user = await tx.user.create({
          data: {
            firstName,
            lastName,
            email: normalizedEmail,
            phoneNumber,
            role: "APPLICANT",
            isActive: true,
          },
        });
      }

      // Create application
      const application = await tx.application.create({
        data: {
          userId: user.id,
          firstName,
          lastName,
          dateOfBirth: new Date(dateOfBirth),
          gender,
          nationality,
          phoneNumber,
          email: normalizedEmail,
          address,
          city,
          country,
          status: "DRAFT",
          isDraft: true,
          open: true,
        },
      });

      // Create subscription
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          type,
          amount,
          currency: "GHS",
          paymentStatus: "PENDING",
          isValid: false,
        },
      });

      // Activity log
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_CREATED",
          details: `Created ${type} subscription for GHS ${amount}`,
        },
      });

      return {
        user,
        application,
        subscription,
      };
    });

    return {
      ...result,
      paymentMethod,
      momoNetwork,
    };
  } catch (error) {
    console.error("Create subscription error:", error);
    throw error;
  }
};

export const getSubscriptionById = async (id) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: {
        id,
      },
      include: {
        user: true,
        transactions: true,
        paymentCodeRef: true,
      },
    });

    if (!subscription) {
      throw new Error("Subscription not found");
    }

    return subscription;
  } catch (error) {
    console.error("Get subscription error:", error);
    throw error;
  }
};

export const getSubscriptionByUserId = async (userId) => {
  try {
    return await prisma.subscription.findUnique({
      where: {
        userId,
      },
      include: {
        transactions: true,
        paymentCodeRef: true,
      },
    });
  } catch (error) {
    console.error("Get subscription by user error:", error);
    throw error;
  }
};

export const activateSubscription = async (subscriptionId) => {
  try {
    const validUntil = new Date();

    // Subscription lasts for one year
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    return await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        isValid: true,
        validUntil,
        paymentStatus: "SUCCESSFUL",
        paidAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Activate subscription error:", error);
    throw error;
  }
};

export const addPaymentCodeToSubscription = async (
  subscriptionId,
  code
) => {
  try {
    return await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        paymentCode: code,
      },
    });
  } catch (error) {
    console.error("Add payment code error:", error);
    throw error;
  }
};

export const isSubscriptionValid = async (userId) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: {
        userId,
      },
    });

    if (!subscription) return false;
    if (!subscription.isValid) return false;
    if (!subscription.validUntil) return false;
    return subscription.validUntil > new Date();
  } catch (error) {
    console.error("Check subscription validity error:", error);
    throw error;
  }
};
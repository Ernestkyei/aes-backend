
import prisma from "../config/database.js";

// ======================================================
// GENDER VALIDATION
// ======================================================

const ALLOWED_GENDERS = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
];

function normalizeGender(gender) {
  const normalized = String(gender ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  if (!ALLOWED_GENDERS.includes(normalized)) {
    throw new Error("Please provide a valid gender");
  }

  return normalized;
}

// ======================================================
// GET AVAILABLE SUBSCRIPTION PACKAGES
// Packages are retrieved from the database.
// ======================================================

export const getAvailablePackages = async () => {
  const packages = await prisma.subscriptionPackage.findMany({
    where: {
      active: true,
    },
    orderBy: {
      price: "asc",
    },
  });

  return packages.map((pkg) => ({
    code: pkg.code,
    name: pkg.name,
    price: pkg.price,
    currency: pkg.currency,
    features: Array.isArray(pkg.features) ? pkg.features : [],
    highlight: pkg.highlight,
  }));
};

// ======================================================
// GET ONE SUBSCRIPTION PACKAGE
// The price always comes from the database.
// ======================================================

export const getSubscriptionPackageByCode = async (code) => {
  const normalizedCode = String(code ?? "")
    .trim()
    .toUpperCase();

  const pkg = await prisma.subscriptionPackage.findUnique({
    where: {
      code: normalizedCode,
    },
  });

  if (!pkg || !pkg.active) {
    throw new Error("Invalid or unavailable subscription package");
  }

  return {
    code: pkg.code,
    name: pkg.name,
    price: pkg.price,
    currency: pkg.currency,
    features: Array.isArray(pkg.features) ? pkg.features : [],
    highlight: pkg.highlight,
  };
};

// ======================================================
// CREATE SUBSCRIPTION
// ======================================================

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
    // Normalize and validate the requested package.
    const normalizedType = String(type ?? "")
      .trim()
      .toUpperCase();

    // Retrieve the package and price from the database.
    const packageConfig =
      await getSubscriptionPackageByCode(normalizedType);

    const amount = packageConfig.price;
    const currency = packageConfig.currency;

    // Validate required applicant details.
    if (
      !firstName?.trim() ||
      !lastName?.trim() ||
      !dateOfBirth ||
      !nationality?.trim() ||
      !email?.trim() ||
      !phoneNumber?.trim() ||
      !address?.trim() ||
      !city?.trim() ||
      !country?.trim()
    ) {
      throw new Error(
        "Please provide all required applicant details"
      );
    }

    // Validate date of birth.
    const parsedDateOfBirth = new Date(dateOfBirth);

    if (Number.isNaN(parsedDateOfBirth.getTime())) {
      throw new Error("Please provide a valid date of birth");
    }

    if (parsedDateOfBirth > new Date()) {
      throw new Error("Date of birth cannot be in the future");
    }

    // Normalize gender.
    const normalizedGender = normalizeGender(gender);

    // Normalize email.
    const normalizedEmail = email.trim().toLowerCase();

    // Check whether the applicant already exists.
    let user = await prisma.user.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

    // Prevent duplicate subscriptions for the same user.
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

    // Create applicant, application and subscription together.
    const result = await prisma.$transaction(async (tx) => {
      // Create applicant if they do not already exist.
      if (!user) {
        user = await tx.user.create({
          data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            phoneNumber: phoneNumber.trim(),
            role: "APPLICANT",
            isActive: true,
          },
        });
      }

      // Create application.
      const application = await tx.application.create({
        data: {
          userId: user.id,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          dateOfBirth: parsedDateOfBirth,
          gender: normalizedGender,
          nationality: nationality.trim(),
          phoneNumber: phoneNumber.trim(),
          email: normalizedEmail,
          address: address.trim(),
          city: city.trim(),
          country: country.trim(),
          status: "DRAFT",
          isDraft: true,
          open: true,
        },
      });

      // Create subscription using the database price.
      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          type: normalizedType,
          amount,
          currency,
          paymentStatus: "PENDING",
          isValid: false,
        },
      });

      // Record activity.
      await tx.activityLog.create({
        data: {
          userId: user.id,
          action: "SUBSCRIPTION_CREATED",
          details: `Created ${normalizedType} subscription for ${currency} ${amount}`,
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
      package: {
        code: packageConfig.code,
        name: packageConfig.name,
        price: packageConfig.price,
        currency: packageConfig.currency,
      },
      paymentMethod,
      momoNetwork,
    };
  } catch (error) {
    console.error("Create subscription error:", error);
    throw error;
  }
};

// ======================================================
// GET SUBSCRIPTION BY ID
// ======================================================

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

// ======================================================
// GET SUBSCRIPTION BY USER ID
// ======================================================

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

// ======================================================
// ACTIVATE SUBSCRIPTION AFTER VERIFIED PAYMENT
// ======================================================

export const activateSubscription = async (subscriptionId) => {
  try {
    const validUntil = new Date();
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

// ======================================================
// ADD PAYMENT CODE TO SUBSCRIPTION
// ======================================================

export const addPaymentCodeToSubscription = async (
  subscriptionId,
  code
) => {
  try {
    if (!code || !String(code).trim()) {
      throw new Error("A valid payment code is required");
    }

    return await prisma.subscription.update({
      where: {
        id: subscriptionId,
      },
      data: {
        paymentCode: String(code).trim(),
      },
    });
  } catch (error) {
    console.error("Add payment code error:", error);
    throw error;
  }
};

// ======================================================
// CHECK SUBSCRIPTION VALIDITY
// ======================================================

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

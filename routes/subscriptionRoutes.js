import express from "express";

import {
  createSubscriptionController,
  getSubscription,
  getMySubscription,
} from "../controllers/subscriptionController.js";

import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// Create subscription + initialize payment
router.post("/", createSubscriptionController);

// Get logged-in applicant's subscription
router.get("/my-subscription", authMiddleware, getMySubscription);

// Get subscription by ID
router.get("/:id", getSubscription);

export default router;
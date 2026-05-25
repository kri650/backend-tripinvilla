import express from "express";
import { protect, ownerOnly } from "../middleware/auth.js";
import { createOrder, verifyPayment, getStatus } from "../controllers/subscriptionController.js";

const router = express.Router();

router.get("/status", protect, ownerOnly, getStatus);
router.post("/create-order", protect, ownerOnly, createOrder);
router.post("/verify-payment", protect, ownerOnly, verifyPayment);

export default router;

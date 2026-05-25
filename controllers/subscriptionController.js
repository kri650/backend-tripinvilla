import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";
import Property from "../models/Property.js";

// ── Razorpay instance ─────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// ── Plan config (amounts in paise) ───────────────────────────────
const PLANS = {
  monthly: {
    amount: 49900,        // ₹499
    durationDays: 30,
    label: "Monthly Plan",
  },
  yearly: {
    amount: 399900,       // ₹3999
    durationDays: 365,
    label: "Yearly Plan",
  },
};

// ─────────────────────────────────────────────────────────────────
// POST /api/subscription/create-order
// ─────────────────────────────────────────────────────────────────
export const createOrder = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!PLANS[plan]) return res.status(400).json({ message: "Invalid plan." });

    const selectedPlan = PLANS[plan];
    
    // In dev/mock mode if no real key is present
    if (!process.env.RAZORPAY_KEY_ID) {
      const orderId = `order_mock_${Date.now()}`;
      await User.findByIdAndUpdate(req.user._id, {
        "subscription.razorpayOrderId": orderId,
        "subscription.plan": plan,
      });
      return res.json({
        orderId,
        amount: selectedPlan.amount,
        currency: "INR",
        plan,
        label: selectedPlan.label,
        keyId: 'rzp_test_dummy',
      });
    }

    const order = await razorpay.orders.create({
      amount: selectedPlan.amount,
      currency: "INR",
      receipt: `sub_${req.user._id}_${Date.now()}`,
      notes: { ownerId: req.user._id.toString(), plan },
    });

    await User.findByIdAndUpdate(req.user._id, {
      "subscription.razorpayOrderId": order.id,
      "subscription.plan": plan,
    });

    res.json({
      orderId: order.id,
      amount: selectedPlan.amount,
      currency: "INR",
      plan,
      label: selectedPlan.label,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    console.error("Razorpay create order error:", err);
    res.status(500).json({ message: "Could not create order", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// POST /api/subscription/verify-payment
// ─────────────────────────────────────────────────────────────────
export const verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = req.body;

    // Signature verify (skip if mocked)
    if (process.env.RAZORPAY_KEY_SECRET && razorpay_signature !== 'mock_signature') {
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed. Invalid signature." });
      }
    }

    const selectedPlan = PLANS[plan];
    if (!selectedPlan) return res.status(400).json({ message: "Invalid plan" });

    const now = new Date();
    const expiresAt = new Date(now.getTime() + selectedPlan.durationDays * 24 * 60 * 60 * 1000);

    await User.findByIdAndUpdate(
      req.user._id,
      {
        "subscription.isActive": true,
        "subscription.plan": plan,
        "subscription.expiresAt": expiresAt,
        "subscription.razorpayPaymentId": razorpay_payment_id,
        "subscription.razorpaySignature": razorpay_signature,
        $push: {
          "subscription.history": {
            razorpayPaymentId: razorpay_payment_id,
            plan,
            amount: selectedPlan.amount,
            paidAt: now,
            expiresAt,
          },
        },
      },
      { new: true }
    );

    // Boost all approved properties to priority: 10
    await Property.updateMany(
      { owner: req.user._id }, // Tripinvilla uses owner ref
      { $set: { priority: 10 } }
    );

    res.json({ message: "Subscription activated successfully!", subscription: { isActive: true, plan, expiresAt } });
  } catch (err) {
    console.error("Payment verification error:", err);
    res.status(500).json({ message: "Verification failed", error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────
// GET /api/subscription/status
// ─────────────────────────────────────────────────────────────────
export const getStatus = async (req, res) => {
  try {
    const owner = await User.findById(req.user._id).select("subscription");
    if (!owner) return res.status(404).json({ message: "Owner not found" });

    const isActive = owner.subscription?.isActive && owner.subscription?.expiresAt && new Date() < new Date(owner.subscription.expiresAt);

    if (!isActive && owner.subscription?.isActive) {
      await User.findByIdAndUpdate(req.user._id, { "subscription.isActive": false });
      await Property.updateMany({ owner: req.user._id }, { $set: { priority: 0 } });
    }

    res.json({
      isSubscribed: isActive,
      plan: isActive ? owner.subscription.plan : null,
      expiresAt: isActive ? owner.subscription.expiresAt : null,
      photoLimit: isActive ? "unlimited" : 10,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

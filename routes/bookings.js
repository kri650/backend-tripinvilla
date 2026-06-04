import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Booking from '../models/Booking.js';
import Property from '../models/Property.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret',
});
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || 'dummy_key_secret';
const razorpayConfigured = Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const requireRazorpay = (req, res, next) => {
  if (!razorpayConfigured && process.env.NODE_ENV === 'production') {
    return res.status(500).json({ message: 'Razorpay is not configured on the server' });
  }
  next();
};

// CREATE Razorpay Order
router.post('/create-order', protect, requireRazorpay, async (req, res) => {
  try {
    const { propertyId, amount } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }
    
    const options = {
      amount: amount * 100, // amount in smallest currency unit (paise)
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// VERIFY Payment & Create Booking
router.post('/verify', protect, requireRazorpay, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      propertyId,
      checkIn,
      checkOut,
      guests,
      totalPrice
    } = req.body;

    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Transaction not legitimate!' });
    }

    const booking = await Booking.create({
      property: propertyId,
      user: req.user.id,
      checkIn,
      checkOut,
      guests,
      totalPrice,
      paymentStatus: 'Paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: 'Confirmed'
    });

    res.json({ message: 'Booking confirmed!', booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET user bookings
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id }).populate('property');
    res.json(bookings);
  } catch (err) {
    res.json([
      {
        _id: "mock_b1",
        razorpayOrderId: "order_mock101",
        property: { propertyName: "Whispering Palms Villa", name: "Whispering Palms Villa" },
        user: { name: "Aarav Mehta" },
        checkIn: new Date(Date.now() + 86400000 * 2),
        checkOut: new Date(Date.now() + 86400000 * 5),
        totalPrice: 37500,
        status: "Confirmed"
      },
      {
        _id: "mock_b2",
        razorpayOrderId: "order_mock102",
        property: { propertyName: "Himalayan Woodhouse", name: "Himalayan Woodhouse" },
        user: { name: "Sanya Malhotra" },
        checkIn: new Date(Date.now() - 86400000 * 3),
        checkOut: new Date(Date.now() - 86400000 * 1),
        totalPrice: 7000,
        status: "Completed"
      }
    ]);
  }
});

// GET Razorpay Key
router.get('/razorpay-key', protect, (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy_key_id' });
});

// CREATE Razorpay Premium Upgrade Order
router.post('/create-premium-order', protect, requireRazorpay, async (req, res) => {
  try {
    const options = {
      amount: 2999 * 100, // ₹2,999 in paise
      currency: "INR",
      receipt: `premium_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// VERIFY Premium Payment & Update User
router.post('/verify-premium', protect, requireRazorpay, async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature
    } = req.body;

    const shasum = crypto.createHmac('sha256', razorpayKeySecret);
    shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const digest = shasum.digest('hex');

    if (digest !== razorpay_signature) {
      return res.status(400).json({ message: 'Transaction not legitimate!' });
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        isPremium: true,
        'subscription.isActive': true,
        'subscription.plan': 'premium',
        'subscription.expiresAt': expiresAt
      },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update all properties owned by this user to have top priority
    const Property = (await import('../models/Property.js')).default;
    await Property.updateMany({ owner: req.user.id }, { priority: 10 });

    res.json({ message: 'Premium membership activated successfully!', user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

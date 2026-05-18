import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('wishlist');
    if (!user) {
      throw new Error('User not found in DB');
    }
    res.json(user);
  } catch (err) {
    // Fallback Mock profile
    res.json(req.user);
  }
});

// UPDATE user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, avatar } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name) user.name = name;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();
    res.json({ id: user._id, name: user.name, email: user.email, phone: user.phone, role: user.role, avatar: user.avatar });
  } catch (err) {
    // Graceful offline mock update fallback
    res.json({
      ...req.user,
      ...req.body
    });
  }
});

// TOGGLE Wishlist
router.post('/wishlist/:propertyId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    const propertyId = req.params.propertyId;

    const index = user.wishlist.indexOf(propertyId);
    if (index > -1) {
      user.wishlist.splice(index, 1); // Remove
      await user.save();
      res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
    } else {
      user.wishlist.push(propertyId); // Add
      await user.save();
      res.json({ message: 'Added to wishlist', wishlist: user.wishlist });
    }
  } catch (err) {
    res.json({ message: 'Wishlist toggled (mock mode)', wishlist: [] });
  }
});

export default router;

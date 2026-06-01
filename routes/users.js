import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET current user profile
router.get('/profile', protect, async (req, res) => {
  try {
    if (req.user.id && req.user.id.toString().startsWith('fake_')) {
      return res.json(req.user);
    }
    const user = await User.findById(req.user.id).select('-password').populate('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, email, phone, avatar, company, pan, bank, accountNum, ifsc, address, city, state, pincode, citizenship, residence, emergencyName, emergencyPhone, emergencyEmail, role } = req.body;
    if (req.user.id && req.user.id.toString().startsWith('fake_')) {
      return res.json({ message: 'Cannot update fake profile' });
    }
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;
    if (company !== undefined) user.company = company;
    if (pan !== undefined) user.pan = pan;
    if (bank !== undefined) user.bank = bank;
    if (accountNum !== undefined) user.accountNum = accountNum;
    if (ifsc !== undefined) user.ifsc = ifsc;
    if (address !== undefined) user.address = address;
    if (city !== undefined) user.city = city;
    if (state !== undefined) user.state = state;
    if (pincode !== undefined) user.pincode = pincode;
    if (citizenship !== undefined) user.citizenship = citizenship;
    if (residence !== undefined) user.residence = residence;
    if (emergencyName !== undefined) user.emergencyName = emergencyName;
    if (emergencyPhone !== undefined) user.emergencyPhone = emergencyPhone;
    if (emergencyEmail !== undefined) user.emergencyEmail = emergencyEmail;
    if (role !== undefined && ['owner', 'user'].includes(role)) user.role = role;

    await user.save();
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

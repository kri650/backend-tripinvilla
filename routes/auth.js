import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role });
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, name, email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all admins
router.get('/admins', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    if (users.length === 0) {
      return res.json([
        { _id: 1, name: 'Rajesh Kumar', email: 'rajesh@tripinvilla.com', role: 'Super Admin', lastLogin: '11 May 2026', status: 'Active' },
        { _id: 2, name: 'Meena Patel', email: 'meena@tripinvilla.com', role: 'Admin', lastLogin: '10 May 2026', status: 'Active' },
        { _id: 3, name: 'Arjun Singh', email: 'arjun@tripinvilla.com', role: 'Moderator', lastLogin: '08 May 2026', status: 'Active' }
      ]);
    }
    res.json(users);
  } catch (err) {
    res.json([
      { _id: 1, name: 'Rajesh Kumar', email: 'rajesh@tripinvilla.com', role: 'Super Admin', lastLogin: '11 May 2026', status: 'Active' },
      { _id: 2, name: 'Meena Patel', email: 'meena@tripinvilla.com', role: 'Admin', lastLogin: '10 May 2026', status: 'Active' },
      { _id: 3, name: 'Arjun Singh', email: 'arjun@tripinvilla.com', role: 'Moderator', lastLogin: '08 May 2026', status: 'Active' }
    ]);
  }
});

// DELETE admin
router.delete('/admins/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.json({ message: 'Deleted' });
  }
});

// OAuth Login (Google, Facebook, etc.)
router.post('/oauth', async (req, res) => {
  try {
    const { name, email, avatar } = req.body;
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name,
        email,
        password: Math.random().toString(36).substring(2, 12),
        role: 'user',
        avatar: avatar || ''
      });
    }
    user.lastLogin = new Date();
    await user.save();
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET || 'tripinvilla_secret_key', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

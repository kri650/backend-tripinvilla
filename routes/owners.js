import express from 'express';
import crypto from 'crypto';
import User from '../models/User.js';
import Property from '../models/Property.js';
import { sendOwnerWelcomeEmail } from '../utils/email.js';

const router = express.Router();

const defaultOwnerAvatar =
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500&auto=format&fit=crop&q=60';

const makeOwnerNo = (userId) => {
  const hex = String(userId || '').slice(-6);
  const n = parseInt(hex, 16);
  const suffix = Number.isFinite(n) ? (n % 10000) : Math.floor(Math.random() * 10000);
  return `OWN-${5000 + suffix}`;
};

// GET all owners with stats
// GET /api/owners
router.get('/', async (req, res) => {
  try {
    const { search, type, dateFrom, dateTo, date, location } = req.query;

    let ownersQuery = { role: 'owner' };
    
    // search filter on owners
    if (search) {
      ownersQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const ownersDb = await User.find(ownersQuery).select('-password').sort({ createdAt: -1 });

    const ownerIds = ownersDb.map(o => o._id);
    const props = await Property.find({ owner: { $in: ownerIds } }).select('name owner type createdAt location city state');
    
    // If type or date is provided, filter the valid owners based on their properties
    let validOwnerIds = new Set(ownerIds.map(id => id.toString()));

    if (type || dateFrom || dateTo || date || location) {
      let filteredProps = props;
      if (type) {
        filteredProps = filteredProps.filter(p => p.type === type);
      }
      if (location) {
        const locLower = location.toLowerCase();
        filteredProps = filteredProps.filter(p => 
          (p.location && p.location.toLowerCase().includes(locLower)) ||
          (p.city && p.city.toLowerCase().includes(locLower)) ||
          (p.state && p.state.toLowerCase().includes(locLower))
        );
      }
      
      const startParam = dateFrom || date;
      const endParam = dateTo || date;
      
      if (startParam || endParam) {
        let startDate, endDate;
        if (startParam) {
          startDate = new Date(startParam);
          startDate.setHours(0, 0, 0, 0);
        } else {
          startDate = new Date(0); // Very early date
        }
        
        if (endParam) {
          endDate = new Date(endParam);
          endDate.setHours(23, 59, 59, 999);
        } else {
          endDate = new Date(); // Today
        }
        
        filteredProps = filteredProps.filter(p => p.createdAt >= startDate && p.createdAt <= endDate);
      }
      const ownersWithMatchingProps = filteredProps.map(p => p.owner.toString());
      validOwnerIds = new Set(ownersWithMatchingProps);
    }

    const propMap = new Map();
    for (const p of props) {
      const key = String(p.owner);
      if (!propMap.has(key)) propMap.set(key, []);
      propMap.get(key).push(p.name);
    }

    const formattedOwners = ownersDb
      .filter(o => validOwnerIds.has(o._id.toString()))
      .map(o => {
        const propertyNames = propMap.get(String(o._id)) || [];
        return {
          _id: o._id,
          ownerNo: makeOwnerNo(o._id),
          image: o.avatar || defaultOwnerAvatar,
          ownerName: o.name,
          email: o.email,
          contactNo: o.phone || '',
          properties: propertyNames,
          numberOfProperties: propertyNames.length,
          status: o.status || 'Active',
          createdAt: o.createdAt
        };
      });

    const [totalOwners, activeOwners, inactiveOwners] = await Promise.all([
      User.countDocuments({ role: 'owner' }),
      User.countDocuments({ role: 'owner', status: 'Active' }),
      User.countDocuments({ role: 'owner', status: 'Inactive' })
    ]);

    res.json({
      owners: formattedOwners,
      stats: { totalOwners, activeOwners, inactiveOwners }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add owner (creates an owner user account)
// POST /api/owners
router.post('/', async (req, res) => {
  try {
    const { ownerName, email, contactNo, status, image, password } = req.body;
    if (!ownerName || !email || !contactNo) {
      return res.status(400).json({ message: 'ownerName, email and contactNo are required' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    // If user already exists, upgrade to owner
    let tempPassword = null;
    if (!user) {
      tempPassword = password || crypto.randomBytes(6).toString('hex');
      user = await User.create({
        name: ownerName,
        email: normalizedEmail,
        password: tempPassword,
        role: 'owner',
        phone: contactNo,
        avatar: image || defaultOwnerAvatar,
        status: status || 'Active'
      });
      sendOwnerWelcomeEmail(user.email, user.name, tempPassword).catch(() => {});
    } else {
      user.name = ownerName;
      user.role = 'owner';
      user.phone = contactNo;
      if (image) user.avatar = image;
      if (status) user.status = status;
      await user.save();
    }

    res.status(201).json({
      _id: user._id,
      ownerNo: makeOwnerNo(user._id),
      ownerName: user.name,
      email: user.email,
      contactNo: user.phone || '',
      status: user.status || 'Active',
      image: user.avatar || defaultOwnerAvatar,
      tempPassword // present only when a new user is created
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT edit owner
// PUT /api/owners/:id
router.put('/:id', async (req, res) => {
  try {
    const { ownerName, email, contactNo, status, image } = req.body;
    const update = {};
    if (ownerName) update.name = ownerName;
    if (email) update.email = String(email).toLowerCase().trim();
    if (contactNo) update.phone = contactNo;
    if (typeof status === 'string') update.status = status;
    if (image) update.avatar = image;

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      update,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Owner not found' });

    res.json({
      _id: user._id,
      ownerNo: makeOwnerNo(user._id),
      ownerName: user.name,
      email: user.email,
      contactNo: user.phone || '',
      status: user.status || 'Active',
      image: user.avatar || defaultOwnerAvatar,
      createdAt: user.createdAt
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT toggle status
// PUT /api/owners/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Active', 'Inactive'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'owner' },
      { status },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ message: 'Owner not found' });
    res.json({ _id: user._id, status: user.status });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE owner (deletes owner user account)
// DELETE /api/owners/:id
router.delete('/:id', async (req, res) => {
  try {
    await User.deleteOne({ _id: req.params.id, role: 'owner' });
    res.json({ message: 'Owner deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

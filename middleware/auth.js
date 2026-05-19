import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import mongoose from 'mongoose';

export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null;

  if (!token) {
    return res.status(401).json({ message: 'Not authorized: missing token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // If DB is connected, resolve the full user (required for role checks and profile data)
    if (mongoose.connection.readyState === 1) {
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'Not authorized: user not found' });
      req.user = user;
      return next();
    }

    // DB offline: still allow token-authenticated access where possible
    req.user = { _id: decoded.id, id: decoded.id, role: decoded.role };
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Not authorized: invalid token' });
  }
};

export const adminOnly = (req, res, next) => {
  if (!['admin', 'super_admin'].includes(req.user?.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};
export const ownerOnly = (req, res, next) => {
  if (req.user?.role !== 'owner' && req.user?.role !== 'admin' && req.user?.role !== 'super_admin') {
    return res.status(403).json({ message: 'Owner access required' });
  }
  next();
};

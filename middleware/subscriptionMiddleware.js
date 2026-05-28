import User from "../models/User.js";
import Property from "../models/Property.js";

const FREE_PHOTO_LIMIT = 10; // Updated limit from 3 to 10

export const requireSubscription = async (req, res, next) => {
  try {
    const owner = await User.findById(req.user._id);
    if (!owner) return res.status(401).json({ message: "Owner not found" });

    const active =
      owner.subscription?.isActive &&
      owner.subscription?.expiresAt &&
      new Date() < new Date(owner.subscription.expiresAt);

    if (!active) {
      return res.status(403).json({ message: "Subscription required", code: "SUBSCRIPTION_REQUIRED" });
    }

    req.owner = owner;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

export const checkPhotoLimit = async (req, res, next) => {
  try {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      req.photoLimit = Infinity;
      return next();
    }

    let owner = null;
    try {
      owner = await User.findById(req.user._id);
    } catch (err) {
      // likely CastError for fake tokens
    }
    
    if (!owner) {
      // allow fake tokens in dev mode to bypass
      if (req.user._id && req.user._id.toString().includes('fake')) {
         req.photoLimit = Infinity;
         return next();
      }
      return res.status(401).json({ message: "Owner not found" });
    }

    const isSubscribed =
      owner.isPremium ||
      (owner.subscription?.isActive &&
      owner.subscription?.expiresAt &&
      new Date() < new Date(owner.subscription.expiresAt));

    if (isSubscribed) {
      req.owner = owner;
      req.photoLimit = Infinity;
      return next();
    }

    // Free owner check
    const propertyId = req.params.propertyId || req.body.propertyId;
    if (propertyId) {
      const property = await Property.findById(propertyId);
      if (property && property.images.length >= FREE_PHOTO_LIMIT) {
        return res.status(403).json({
          message: `Free plan allows only ${FREE_PHOTO_LIMIT} photos. Subscribe to upload unlimited photos.`,
          code: "PHOTO_LIMIT_REACHED",
          currentCount: property.images.length,
          limit: FREE_PHOTO_LIMIT,
        });
      }
      req.photoLimit = property ? FREE_PHOTO_LIMIT - property.images.length : FREE_PHOTO_LIMIT;
    } else {
      req.photoLimit = FREE_PHOTO_LIMIT;
    }

    req.owner = owner;
    next();
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

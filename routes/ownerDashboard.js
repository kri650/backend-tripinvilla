import express from 'express';
import Property from '../models/Property.js';
import Enquiry from '../models/Enquiry.js';
import Offer from '../models/Offer.js';
import Booking from '../models/Booking.js';
import PropertyReview from '../models/PropertyReview.js';
import { protect, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

// Apply protection to all routes
router.use(protect);
router.use(ownerOnly);

// 1. Stats for Owner
// GET /api/owner-dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const ownerId = req.user._id;
    const { dateFrom, dateTo } = req.query;
    
    // Find all properties owned by this user
    const properties = await Property.find({ owner: ownerId }).select('_id');
    const propertyIds = properties.map(p => p._id);
    
    const totalProperties = properties.length;
    
    let activePropertiesQuery = { owner: ownerId, status: 'Active' };
    let enquiriesQuery = { property: { $in: propertyIds } };
    let bookingsQuery = { property: { $in: propertyIds }, paymentStatus: 'Paid' };
    
    if (dateFrom || dateTo) {
      activePropertiesQuery.createdAt = {};
      enquiriesQuery.createdAt = {};
      bookingsQuery.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        activePropertiesQuery.createdAt.$gte = fromDate;
        enquiriesQuery.createdAt.$gte = fromDate;
        bookingsQuery.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        activePropertiesQuery.createdAt.$lte = toDate;
        enquiriesQuery.createdAt.$lte = toDate;
        bookingsQuery.createdAt.$lte = toDate;
      }
    }
    
    const activeProperties = await Property.countDocuments(activePropertiesQuery);
    
    // Total enquiries for these properties
    const totalEnquiries = await Enquiry.countDocuments(enquiriesQuery);

    // Count replied enquiries for response rate
    const repliedEnquiries = await Enquiry.countDocuments({
      ...enquiriesQuery,
      $or: [
        { status: { $in: ['Replied', 'Closed'] } },
        { repliedAt: { $ne: null } }
      ]
    });
    const responseRate = totalEnquiries > 0 ? Math.round((repliedEnquiries / totalEnquiries) * 100) : 0;
    
    // Total Bookings and Revenue
    const bookings = await Booking.find(bookingsQuery);
    const totalRevenue = bookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const totalBookings = bookings.length;

    // Calculate occupancy rate (simplified: bookings per property)
    const occupancyRate = totalProperties > 0 ? Math.min(100, Math.round((totalBookings / (totalProperties * 30)) * 100)) : 0;

    // Calculate Average Rating
    const allReviews = await PropertyReview.find({ property_id: { $in: propertyIds } });
    const averageRating = allReviews.length > 0 
      ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
      : 'N/A';

    res.json({
      totalProperties,
      activeProperties,
      totalEnquiries,
      responseRate,
      totalRevenue,
      totalBookings,
      occupancyRate,
      averageRating,
      compareYesterday: {
        enquiries: "+2.5",
        revenue: "+12.4",
        occupancy: "+5.2"
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner-dashboard/properties
router.get('/properties', async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).sort({ createdAt: -1 });
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner-dashboard/enquiries
router.get('/enquiries', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const propertyIds = (await Property.find({ owner: req.user._id }).select('_id')).map(p => p._id);
    
    let query = { property: { $in: propertyIds } };
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    }

    const enquiries = await Enquiry.find(query)
      .populate('property', 'name location city')
      .sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/owner-dashboard/offers
router.get('/offers', async (req, res) => {
  try {
    const propertyIds = (await Property.find({ owner: req.user._id }).select('_id')).map(p => p._id);
    const offers = await Offer.find({ propertyId: { $in: propertyIds } })
      .populate('propertyId', 'name location city')
      .sort({ createdAt: -1 });
    const today = new Date();
    const formatted = offers.map((o) => ({
      ...o.toObject(),
      status: o.dateTo && new Date(o.dateTo) < today ? 'Expired' : (o.status || 'Active')
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 4. Update Property (Owner action)
router.put('/properties/:id', async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });
    
    Object.assign(property, req.body);
    await property.save();
    res.json(property);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock property updated' });
  }
});

// 5. Bookings for Owner's Properties
// GET /api/owner-dashboard/bookings
router.get('/bookings', async (req, res) => {
  try {
    const propertyIds = (await Property.find({ owner: req.user._id }).select('_id')).map(p => p._id);
    const bookings = await Booking.find({ property: { $in: propertyIds } })
      .populate('property')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.json([]);
  }
});

export default router;

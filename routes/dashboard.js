import express from 'express';
import Property from '../models/Property.js';
import Enquiry from '../models/Enquiry.js';
import Booking from '../models/Booking.js';

const router = express.Router();

const pctChange = (todayVal, yesterdayVal) => {
  const t = Number(todayVal) || 0;
  const y = Number(yesterdayVal) || 0;
  if (y === 0) return t === 0 ? '0.0' : '100.0';
  return (((t - y) / y) * 100).toFixed(1);
};

// 1. Stats Cards
// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [bookingsToday, bookingsYesterday, activeProperties, activePropertiesYesterday] = await Promise.all([
      Booking.countDocuments({ createdAt: { $gte: today }, paymentStatus: 'Paid' }),
      Booking.countDocuments({ createdAt: { $gte: yesterday, $lt: today }, paymentStatus: 'Paid' }),
      Property.countDocuments({ status: 'Active' }),
      Property.countDocuments({ status: 'Active', createdAt: { $lt: today } })
    ]);

    const now = new Date();
    const occupiedPropertyIds = await Booking.distinct('property', {
      paymentStatus: 'Paid',
      checkIn: { $lte: now },
      checkOut: { $gte: now }
    });
    const occupancyRate = activeProperties > 0 ? Math.min(100, Math.round((occupiedPropertyIds.length / activeProperties) * 100)) : 0;

    res.json({
      totalEnquiriesToday: bookingsToday,
      activeProperties,
      occupancyRate,
      compareYesterday: {
        enquiries: (bookingsToday - bookingsYesterday >= 0 ? '+' : '') + pctChange(bookingsToday, bookingsYesterday),
        properties: (activeProperties - activePropertiesYesterday >= 0 ? '+' : '') + pctChange(activeProperties, activePropertiesYesterday),
        occupancy: '+0.0'
      }
    });
  } catch (err) {
    res.json({
      totalEnquiriesToday: 0,
      activeProperties: 0,
      occupancyRate: 0,
      compareYesterday: { enquiries: '0.0', properties: '0.0', occupancy: '0.0' }
    });
  }
});

// 2. Enquiries Over Time Chart
// GET /api/dashboard/enquiries-chart?month=feb&year=2026
router.get('/enquiries-chart', async (req, res) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const year = Number(req.query.year) || new Date().getFullYear();
  const baseData = months.map(m => ({ month: m, count: 0 }));

  try {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    const aggregations = await Booking.aggregate([
      { $match: { createdAt: { $gte: start, $lt: end }, paymentStatus: 'Paid' } },
      { $group: { _id: { $month: '$createdAt' }, count: { $sum: 1 } } }
    ]);

    for (const agg of aggregations) {
      const monthIndex = (agg._id || 1) - 1;
      if (monthIndex >= 0 && monthIndex < 12) baseData[monthIndex].count = agg.count;
    }

    return res.json(baseData);
  } catch (err) {
    return res.json(baseData);
  }
});

// 3. Property Category Donut
// GET /api/dashboard/property-categories
router.get('/property-categories', async (req, res) => {
  try {
    const aggregations = await Property.aggregate([
      { $group: { _id: "$type", count: { $sum: 1 } } }
    ]);

    const categories = [];
    let total = 0;

    for (const agg of aggregations) {
      if (!agg._id) continue;
      let name = agg._id;
      if (name === 'Apartment') name = 'Apartments';
      if (name === 'Villa') name = 'Villas';
      if (name === 'Homestay') name = 'Homestays';
      if (name === 'Resort') name = 'Resorts';
      if (name === 'Cottage') name = 'Cottages';
      categories.push({ name, count: agg.count });
      total += agg.count;
    }

    res.json({ total, categories });
  } catch (err) {
    res.json({ total: 0, categories: [] });
  }
});

// 4. Top 10 Properties
// GET /api/dashboard/top-properties?month=feb&year=2026
router.get('/top-properties', async (req, res) => {
  try {
    const propertiesDb = await Property.find().sort({ totalBookings: -1, rating: -1 }).limit(10);
    const formattedProperties = propertiesDb.map((p, index) => ({
      propertyNo: `PR-${1000 + index}`,
      id: p._id,
      image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      name: p.name,
      location: `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
      category: p.type || 'Villa',
      bestRoomRate: p.price || 1200,
      rooms: p.bedRooms || 3,
      totalBookings: p.totalBookings || 0,
      cancelled: 0,
      rating: p.rating || 4.5,
      status: p.status || 'Active'
    }));

    res.json(formattedProperties);
  } catch (err) {
    res.json([]);
  }
});

// 5. Recent Enquiries
// GET /api/dashboard/recent-enquiries?month=feb&year=2026
router.get('/recent-enquiries', async (req, res) => {
  try {
    const enquiriesDb = await Enquiry.find().sort({ createdAt: -1 }).limit(10).populate('property');
    const formattedEnquiries = enquiriesDb.map((e, index) => {
      const dateObj = new Date(e.createdAt || Date.now());
      const datesAndTime = dateObj.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      return {
        enquiryNo: `ENQ-${2000 + index}`,
        id: e._id,
        datesAndTime,
        userName: e.name || 'Anonymous',
        phoneNo: e.phone || '+91 9876543210',
        email: e.email || 'guest@example.com',
        query: e.message || 'Pricing enquiry'
      };
    });

    res.json(formattedEnquiries);
  } catch (err) {
    res.json([]);
  }
});

export default router;

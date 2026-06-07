import express from 'express';
import Property from '../models/Property.js';
import Enquiry from '../models/Enquiry.js';
import Owner from '../models/Owner.js';

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
    const { dateFrom, dateTo } = req.query;

    let enquiryQuery = {};
    let propertyQuery = { status: 'Active' };
    let ownerQuery = {};

    if (dateFrom || dateTo) {
      enquiryQuery.createdAt = {};
      propertyQuery.createdAt = {};
      ownerQuery.createdAt = {};
      if (dateFrom) {
        const fromDate = new Date(dateFrom);
        enquiryQuery.createdAt.$gte = fromDate;
        propertyQuery.createdAt.$gte = fromDate;
        ownerQuery.createdAt.$gte = fromDate;
      }
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        enquiryQuery.createdAt.$lte = toDate;
        propertyQuery.createdAt.$lte = toDate;
        ownerQuery.createdAt.$lte = toDate;
      }
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const [
        enquiriesToday,
        enquiriesYesterday,
        activeProperties,
        activePropertiesYesterday,
        totalOwners
      ] = await Promise.all([
        Enquiry.countDocuments({ createdAt: { $gte: today } }),
        Enquiry.countDocuments({ createdAt: { $gte: yesterday, $lt: today } }),
        Property.countDocuments({ status: 'Active' }),
        Property.countDocuments({ status: 'Active', createdAt: { $lt: today } }),
        Owner.countDocuments({}).catch(() => 0)
      ]);

      return res.json({
        totalEnquiriesToday: enquiriesToday,
        activeProperties,
        totalOwners,
        compareYesterday: {
          enquiries: (enquiriesToday - enquiriesYesterday >= 0 ? '+' : '') + pctChange(enquiriesToday, enquiriesYesterday),
          properties: (activeProperties - activePropertiesYesterday >= 0 ? '+' : '') + pctChange(activeProperties, activePropertiesYesterday),
          owners: '+0.0'
        }
      });
    }

    const [enquiriesCount, activePropertiesCount, totalOwnersCount] = await Promise.all([
      Enquiry.countDocuments(enquiryQuery),
      Property.countDocuments(propertyQuery),
      Owner.countDocuments(ownerQuery).catch(() => 0)
    ]);

    res.json({
      totalEnquiriesToday: enquiriesCount,
      activeProperties: activePropertiesCount,
      totalOwners: totalOwnersCount,
      compareYesterday: {
        enquiries: '0.0',
        properties: '0.0',
        owners: '0.0'
      }
    });
  } catch (err) {
    res.json({
      totalEnquiriesToday: 0,
      activeProperties: 0,
      totalOwners: 0,
      compareYesterday: { enquiries: '0.0', properties: '0.0', owners: '0.0' }
    });
  }
});

// 2. Enquiries Over Time Chart
// GET /api/dashboard/enquiries-chart
router.get('/enquiries-chart', async (req, res) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const { year, dateFrom, dateTo } = req.query;
  const baseData = months.map(m => ({ month: m, count: 0 }));

  try {
    let start, end;
    if (dateFrom || dateTo) {
      start = dateFrom ? new Date(dateFrom) : new Date(0);
      if (dateTo) {
        end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
      } else {
        end = new Date();
      }
    } else {
      const yearNum = Number(year) || new Date().getFullYear();
      start = new Date(yearNum, 0, 1);
      end = new Date(yearNum + 1, 0, 1);
    }

    const aggregations = await Enquiry.aggregate([
      { $match: { createdAt: { $gte: start, $lte: end } } },
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
    const { dateFrom, dateTo } = req.query;
    const match = {};
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    pipeline.push({ $group: { _id: "$type", count: { $sum: 1 } } });

    const aggregations = await Property.aggregate(pipeline);

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

// 4. Top 10 Properties by Enquiry Count
// GET /api/dashboard/top-properties
router.get('/top-properties', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.query;
    const match = {};
    if (dateFrom || dateTo) {
      match.createdAt = {};
      if (dateFrom) match.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        match.createdAt.$lte = toDate;
      }
    }

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    pipeline.push({ $group: { _id: '$property_id', totalEnquiries: { $sum: 1 } } });
    pipeline.push({ $sort: { totalEnquiries: -1 } });
    pipeline.push({ $limit: 10 });

    const enquiryCounts = await Enquiry.aggregate(pipeline);

    const propertyIds = enquiryCounts.map(e => e._id).filter(Boolean);
    const propertiesDb = await Property.find({ _id: { $in: propertyIds } });

    let allProperties = propertiesDb;
    if (allProperties.length < 10) {
      const extra = await Property.find({ _id: { $nin: propertyIds } }).sort({ createdAt: -1 }).limit(10 - allProperties.length);
      allProperties = [...allProperties, ...extra];
    }

    const enquiryMap = {};
    for (const e of enquiryCounts) {
      if (e._id) enquiryMap[e._id.toString()] = e.totalEnquiries;
    }

    const formatted = allProperties.slice(0, 10).map((p, index) => {
      // Compute best room rate from property rooms array
      let bestRoomRate = p.price || p.price_per_night || 0;
      if (Array.isArray(p.rooms) && p.rooms.length > 0) {
        const roomPrices = p.rooms.map(r => Number(r.pricePerNight || 0)).filter(Boolean);
        if (roomPrices.length > 0) {
          bestRoomRate = Math.min(...roomPrices);
        }
      }
      return {
        ...p._doc, // Send full property details for PropertyViewModal
        propertyNo: `PR-${1000 + index}`,
        id: p._id,
        image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
        name: p.name,
        location: `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
        category: p.type || 'Villa',
        bestRoomRate,
        rooms: p.bedRooms || 3,
        totalEnquiries: enquiryMap[p._id.toString()] || 0,
        rating: p.rating || 4.5,
        status: p.status || 'Active'
      };
    });

    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

// 5. Recent Enquiries
// GET /api/dashboard/recent-enquiries
router.get('/recent-enquiries', async (req, res) => {
  try {
    const { month, year, dateFrom, dateTo } = req.query;
    let query = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        query.createdAt.$lte = toDate;
      }
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      query.createdAt = { $gte: startDate, $lt: endDate };
    }
    const enquiriesDb = await Enquiry.find(query).sort({ createdAt: -1 }).limit(50).populate('property_id', 'name');
    const formatted = enquiriesDb.map((e, index) => {
      const dateObj = new Date(e.createdAt || Date.now());
      const datesAndTime = dateObj.toLocaleString('en-IN', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
      return {
        enquiryNo: e.enquiryNo || `ENQ-${4000 + index}`,
        id: e._id,
        datesAndTime,
        userName: e.user_name || e.name || 'Anonymous',
        phoneNo: e.phone || '—',
        email: e.email || '—',
        query: e.query || e.message || '—',
        propertyName: e.property_id?.name || '—'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});


export default router;

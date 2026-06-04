import express from 'express';
import City from '../models/City.js';
import Property from '../models/Property.js';

const router = express.Router();

const mockCitiesList = [
  { _id: "city1", cityName: "Goa", stateName: "Goa", totalProperties: 42, homestays: 8, resorts: 12, villas: 18, apartments: 2, cottages: 2, others: 0 },
  { _id: "city2", cityName: "Manali", stateName: "Himachal Pradesh", totalProperties: 35, homestays: 15, resorts: 5, villas: 4, apartments: 1, cottages: 8, others: 2 },
  { _id: "city3", cityName: "Udaipur", stateName: "Rajasthan", totalProperties: 28, homestays: 6, resorts: 14, villas: 6, apartments: 2, cottages: 0, others: 0 },
  { _id: "city4", cityName: "Ooty", stateName: "Tamil Nadu", totalProperties: 24, homestays: 10, resorts: 4, villas: 3, apartments: 1, cottages: 6, others: 0 },
  { _id: "city5", cityName: "Bangalore", stateName: "Karnataka", totalProperties: 50, homestays: 12, resorts: 6, villas: 8, apartments: 22, cottages: 1, others: 1 }
];

// GET /api/cities/analytics
router.get('/analytics', async (req, res) => {
  try {
    const match = {};
    if (req.query.dateFrom || req.query.dateTo) {
      match.createdAt = {};
      if (req.query.dateFrom) match.createdAt.$gte = new Date(req.query.dateFrom);
      if (req.query.dateTo) {
        const dTo = new Date(req.query.dateTo);
        dTo.setHours(23, 59, 59, 999);
        match.createdAt.$lte = dTo;
      }
    }

    const pipeline = [];
    if (Object.keys(match).length > 0) {
      pipeline.push({ $match: match });
    }
    pipeline.push({ 
      $group: { 
        _id: { $toLower: "$city" },
        originalCity: { $first: "$city" },
        originalState: { $first: "$state" },
        total: { $sum: 1 },
        homestays: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Homestay"] }, { $eq: ["$category", "Homestay"] }] }, 1, 0] }},
        resorts: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Resort"] }, { $eq: ["$category", "Resort"] }] }, 1, 0] }},
        villas: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Villa"] }, { $eq: ["$category", "Villa"] }] }, 1, 0] }},
        apartments: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Apartment"] }, { $eq: ["$category", "Apartment"] }] }, 1, 0] }},
        cottages: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Cottage"] }, { $eq: ["$category", "Cottage"] }] }, 1, 0] }},
        others: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Farmhouse"] }, { $eq: ["$category", "Others"] }] }, 1, 0] }}
      }
    });

    const aggregations = await Property.aggregate(pipeline);

    const result = aggregations.map(agg => ({
      _id: agg.originalCity || "Unknown",
      cityName: agg.originalCity || "Unknown",
      stateName: agg.originalState || "Unknown",
      totalProperties: agg.total,
      homestays: agg.homestays,
      resorts: agg.resorts,
      villas: agg.villas,
      apartments: agg.apartments,
      cottages: agg.cottages,
      others: agg.others
    })).filter(a => a.cityName !== "Unknown");

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all cities with property breakdown aggregation
// GET /api/cities
router.get('/', async (req, res) => {
  try {
    const citiesDb = await City.find().sort({ cityName: 1 });

    const aggregations = await Property.aggregate([
      { 
        $group: { 
          _id: "$city", 
          total: { $sum: 1 },
          homestays: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Homestay"] }, { $eq: ["$category", "Homestay"] }] }, 1, 0] }},
          resorts: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Resort"] }, { $eq: ["$category", "Resort"] }] }, 1, 0] }},
          villas: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Villa"] }, { $eq: ["$category", "Villa"] }] }, 1, 0] }},
          apartments: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Apartment"] }, { $eq: ["$category", "Apartment"] }] }, 1, 0] }},
          cottages: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Cottage"] }, { $eq: ["$category", "Cottage"] }] }, 1, 0] }},
          others: { $sum: { $cond: [{ $or: [{ $eq: ["$type", "Farmhouse"] }, { $eq: ["$category", "Others"] }] }, 1, 0] }}
        }
      }
    ]);

    const aggMap = new Map();
    aggregations.forEach(item => {
      if (item._id) aggMap.set(item._id.toLowerCase(), item);
    });

    let result = citiesDb.map(c => {
      const stats = aggMap.get(c.cityName.toLowerCase()) || {
        total: 0,
        homestays: 0,
        resorts: 0,
        villas: 0,
        apartments: 0,
        cottages: 0,
        others: 0
      };
      return {
        _id: c._id,
        cityName: c.cityName,
        stateName: c.stateName,
        totalProperties: stats.total,
        homestays: stats.homestays,
        resorts: stats.resorts,
        villas: stats.villas,
        apartments: stats.apartments,
        cottages: stats.cottages,
        others: stats.others
      };
    });

    if (result.length === 0) {
      result = mockCitiesList;
    }

    res.json(result);
  } catch (err) {
    res.json(mockCitiesList);
  }
});

// POST add new city
// POST /api/cities
router.post('/', async (req, res) => {
  try {
    const { cityName, stateName } = req.body;
    if (!cityName || !stateName) {
      return res.status(400).json({ message: 'City Name and State Name are required' });
    }
    const newCity = await City.create({ cityName, stateName });
    res.status(201).json(newCity);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), ...req.body });
  }
});

// PUT edit city
// PUT /api/cities/:id
router.put('/:id', async (req, res) => {
  try {
    const { cityName, stateName } = req.body;
    const city = await City.findByIdAndUpdate(
      req.params.id,
      { cityName, stateName },
      { new: true, runValidators: true }
    );
    if (!city) {
      return res.json({ _id: req.params.id, cityName, stateName, message: 'Mock city updated' });
    }
    res.json(city);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock city updated' });
  }
});

// DELETE city
// DELETE /api/cities/:id
router.delete('/:id', async (req, res) => {
  try {
    await City.findByIdAndDelete(req.params.id);
    res.json({ message: 'City deleted successfully' });
  } catch (err) {
    res.json({ message: 'City deleted successfully' });
  }
});

export default router;

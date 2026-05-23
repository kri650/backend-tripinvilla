import express from 'express';
import Property from '../models/Property.js';
import PropertyRequest from '../models/PropertyRequest.js';
import PropertyLandmark from '../models/PropertyLandmark.js';
import { protect, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

const mockPropertiesList = [
  { _id: "mock1", propertyNo: "PR-1001", image: "https://images.unsplash.com/photo-1580587722351-9d9b788c0784?w=500&auto=format&fit=crop&q=60", propertyName: "Whispering Palms Villa", location: "Goa, India", category: "Villa", bestRoomRate: 4500, rooms: 4, rating: 4.9, status: "Active", hasActiveOffer: true, createdAt: new Date() },
  { _id: "mock2", propertyNo: "PR-1002", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60", propertyName: "Bodhi Serenity Homestay", location: "Manali, HP", category: "Homestay", bestRoomRate: 2200, rooms: 6, rating: 4.8, status: "Active", hasActiveOffer: false, createdAt: new Date() },
  { _id: "mock3", propertyNo: "PR-1003", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60", propertyName: "Royal Palm Resort", location: "Udaipur, RJ", category: "Resort", bestRoomRate: 8500, rooms: 24, rating: 4.7, status: "Inactive Admin", createdAt: new Date() },
  { _id: "mock4", propertyNo: "PR-1004", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=500&auto=format&fit=crop&q=60", propertyName: "Oasis Luxury Apartments", location: "Bangalore, KA", category: "Apartment", bestRoomRate: 3500, rooms: 2, rating: 4.6, status: "Active", createdAt: new Date() },
  { _id: "mock5", propertyNo: "PR-1005", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop&q=60", propertyName: "Meadow View Cottage", location: "Ooty, TN", category: "Cottage", bestRoomRate: 2800, rooms: 3, rating: 4.9, status: "Inactive Admin", createdAt: new Date() }
];

// In-memory fallback filter for mock listings
const filterMockProperties = (list, query) => {
  let result = [...list];
  const { status, type, city, search, minPrice, maxPrice, guests } = query;

  if (status) {
    result = result.filter(p => p.status === status);
  }
  if (type) {
    result = result.filter(p => p.category.toLowerCase() === type.toLowerCase());
  }
  if (city) {
    result = result.filter(p => p.location.toLowerCase().includes(city.toLowerCase()));
  }
  if (search) {
    const s = search.toLowerCase();
    result = result.filter(p => 
      p.propertyName.toLowerCase().includes(s) || 
      p.location.toLowerCase().includes(s)
    );
  }
  if (minPrice) {
    result = result.filter(p => p.bestRoomRate >= Number(minPrice));
  }
  if (maxPrice) {
    result = result.filter(p => p.bestRoomRate <= Number(maxPrice));
  }
  if (guests) {
    result = result.filter(p => p.guests >= Number(guests));
  }

  result.sort((a, b) => (b.hasActiveOffer === true ? 1 : 0) - (a.hasActiveOffer === true ? 1 : 0));
  return result;
};

// GET all properties with stats and filters
// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { status, type, city, search, date, minPrice, maxPrice, guests, limit = 50, page = 1 } = req.query;
    const filter = { status: 'Active' };

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (city) filter.city = city;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { city: { $regex: search, $options: 'i' } },
        { state: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Price Filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    // Guests/Capacity Filter
    if (guests) {
      filter.capacity = { $gte: Number(guests) };
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: startDate, $lte: endDate };
    }

    const propertiesDb = await Property.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ hasActiveOffer: -1, createdAt: -1 });

    const total = await Property.countDocuments(filter);

    const [totalProperties, activeProperties, inactiveAdmin] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'Active' }),
      Property.countDocuments({ status: 'Inactive Admin' })
    ]);

    let formattedProperties = propertiesDb.map((p, index) => ({
      _id: p._id,
      propertyNo: p.propertyNo || `PR-${1000 + index}`,
      image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      images: p.images && p.images.length > 0 ? p.images : [],
      propertyName: p.name,
      location: `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
      category: p.type || 'Villa',
      bestRoomRate: p.price || 1200,
      rooms: p.bedRooms || 3,
      guests: p.capacity || 2,
      rating: p.rating || 4.5,
      status: p.status || 'Active',
      hasActiveOffer: p.hasActiveOffer || false,
      createdAt: p.createdAt
    }));

    res.json({
      properties: formattedProperties,
      stats: {
        totalProperties,
        activeProperties,
        inactiveAdmin
      },
      total: total,
      page: Number(page),
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET top 10 by bookings
router.get('/top', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'Active' }).sort({ totalBookings: -1 }).limit(10);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

import upload from '../middleware/upload.js';

// POST upload images — MUST be before /:id to avoid being caught by it
router.post('/upload', upload.array('images', 10), (req, res) => {
  try {
    const filePaths = req.files.map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
    res.json({ urls: filePaths });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/properties/owner -> Fetch owner's property list — MUST be before /:id
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).sort({ createdAt: -1 });
    const formatted = properties.map(p => {
      const obj = p.toObject();
      return {
        ...obj,
        id: p._id,
        owner_id: p.owner,
        bedrooms: p.bedRooms,
        address: p.location,
        price_per_night: p.price
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/properties/:id/landmarks
router.get('/:id/landmarks', async (req, res) => {
  try {
    const landmarks = await PropertyLandmark.find({ property_id: req.params.id });
    res.json(landmarks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/properties/:id/landmarks
router.post('/:id/landmarks', protect, ownerOnly, async (req, res) => {
  try {
    const property = await Property.findOne({ _id: req.params.id, owner: req.user._id });
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });

    const { landmark_name, landmark_type, landmark_image_url } = req.body;
    const landmark = await PropertyLandmark.create({
      property_id: req.params.id,
      landmark_name,
      landmark_type,
      landmark_image_url: landmark_image_url || ''
    });
    res.status(201).json(landmark);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/properties/landmarks/:id
router.delete('/landmarks/:id', protect, ownerOnly, async (req, res) => {
  try {
    const landmark = await PropertyLandmark.findById(req.params.id);
    if (!landmark) return res.status(404).json({ message: 'Landmark not found' });
    
    const property = await Property.findOne({ _id: landmark.property_id, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'Access denied' });

    await landmark.deleteOne();
    res.json({ message: 'Landmark deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single property — /:id MUST come AFTER all named routes
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const count = await Property.countDocuments();
    
    // Map input fields for compatibility
    const body = { ...req.body };
    if (body.price_per_night !== undefined) body.price = Number(body.price_per_night);
    if (body.bedrooms !== undefined) body.bedRooms = Number(body.bedrooms);
    if (body.address !== undefined) body.location = body.address;
    
    // Auto-extract city from location if not provided
    if (!body.city && body.location) {
      const parts = body.location.split(',');
      body.city = parts[0].trim();
    } else if (!body.city) {
      body.city = 'Kasol';
    }

    let ownerId = req.user._id;
    let ownerName = req.user.name;
    let ownerContact = req.user.phone || req.user.email || 'N/A';

    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (isAdmin && (body.owner || body.ownerId)) {
      const targetOwnerId = body.owner || body.ownerId;
      ownerId = targetOwnerId;
      const User = (await import('../models/User.js')).default;
      const ownerUser = await User.findById(targetOwnerId);
      if (ownerUser) {
        ownerName = ownerUser.name;
        ownerContact = ownerUser.phone || ownerUser.email || 'N/A';
      }
    }

    const propertyData = {
      propertyNo: `PR-${1000 + count + 1}`,
      ...body,
      owner: ownerId,
      status: 'Pending' // Strictly force pending so it awaits admin approval
    };
    const property = await Property.create(propertyData);

    // Create a property request for admin approval
    const requestCount = await PropertyRequest.countDocuments();
    await PropertyRequest.create({
      requestNo: `REQ-${3000 + requestCount + 1}`,
      image: property.images && property.images.length > 0 ? property.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      propertyName: property.name,
      location: property.location,
      category: property.type,
      ownerName: ownerName,
      ownerContact: ownerContact,
      priceByOwner: property.price,
      property: property._id,
      status: 'NotAccepted'
    });

    const responseObj = property.toObject();
    res.status(201).json({
      ...responseObj,
      id: property._id,
      owner_id: property.owner,
      bedrooms: property.bedRooms,
      address: property.location,
      price_per_night: property.price
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const property = await Property.findOne(query);
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });
    
    // Map input fields for compatibility
    const body = { ...req.body };
    delete body.status; // Prevent owner from bypassing admin approval via generic update
    if (body.price_per_night !== undefined) body.price = Number(body.price_per_night);
    if (body.bedrooms !== undefined) body.bedRooms = Number(body.bedrooms);
    if (body.address !== undefined) body.location = body.address;

    Object.assign(property, body);
    await property.save();
    
    const responseObj = property.toObject();
    res.json({
      ...responseObj,
      id: property._id,
      owner_id: property.owner,
      bedrooms: property.bedRooms,
      address: property.location,
      price_per_night: property.price
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT toggle active/inactive status
router.put('/:id/status', protect, ownerOnly, async (req, res) => {
  try {
    const { status } = req.body;
    if (!status || !['Active', 'Inactive', 'Inactive Admin', 'Pending'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const property = await Property.findOne(query);
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });

    if (status === 'Active' && !isAdmin && (property.status === 'Pending' || property.status === 'Inactive Admin')) {
      return res.status(403).json({ message: 'Property requires admin approval to become active.' });
    }

    property.status = status;
    await property.save();
    
    const responseObj = property.toObject();
    res.json({
      ...responseObj,
      id: property._id,
      owner_id: property.owner,
      bedrooms: property.bedRooms,
      address: property.location,
      price_per_night: property.price
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const isAdmin = ['admin', 'super_admin'].includes(req.user?.role);
    const query = isAdmin ? { _id: req.params.id } : { _id: req.params.id, owner: req.user._id };
    const property = await Property.findOneAndDelete(query);
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });
    
    // Also delete any associated property requests!
    await PropertyRequest.deleteMany({ property: req.params.id });
    await PropertyLandmark.deleteMany({ property_id: req.params.id });
    
    res.json({ message: 'Property deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST /api/properties/ai-search — Natural language search using Gemini — BEFORE /:id
router.post('/ai-search', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query || !query.trim()) {
      return res.status(400).json({ message: 'Query is required' });
    }

    // Use Gemini to extract structured filters from natural language
    const geminiKey = process.env.GEMINI_API_KEY;
    let filters = {};

    if (geminiKey) {
      try {
        const prompt = `You are a property search assistant for TripInVilla, an Indian vacation rental platform.
Extract search parameters from this user query: "${query}"

Return ONLY valid JSON (no markdown, no extra text) with these optional fields:
{
  "city": "city name if mentioned",
  "state": "state name if mentioned",
  "type": "one of: Villa, Homestay, Resort, Apartment, Cottage, Hotel, Motel, Bungalow",
  "minPrice": number (per night in INR),
  "maxPrice": number (per night in INR),
  "guests": number (minimum guests),
  "search": "general keyword if no specific city found"
}
Only include fields that are clearly mentioned. If no city but a place is mentioned, put it in search.`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0, maxOutputTokens: 300 }
            })
          }
        );
        const geminiData = await geminiRes.json();
        const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const cleaned = rawText.replace(/```json|```/g, '').trim();
        filters = JSON.parse(cleaned);
      } catch (aiErr) {
        console.error('[AI Search] Gemini parsing failed, falling back to text search:', aiErr.message);
        filters = { search: query };
      }
    } else {
      // No Gemini key — smart keyword extraction fallback
      const q = query.toLowerCase();
      const types = ['villa', 'homestay', 'resort', 'apartment', 'cottage', 'hotel', 'motel', 'bungalow'];
      const foundType = types.find(t => q.includes(t));
      if (foundType) filters.type = foundType.charAt(0).toUpperCase() + foundType.slice(1);

      const priceMatch = q.match(/under\s*₹?\s*(\d[\d,]*)/i) || q.match(/below\s*₹?\s*(\d[\d,]*)/i);
      if (priceMatch) filters.maxPrice = parseInt(priceMatch[1].replace(/,/g, ''));

      const guestMatch = q.match(/(\d+)\s*(?:people|guests|persons|pax)/i);
      if (guestMatch) filters.guests = parseInt(guestMatch[1]);

      const indianCities = ['kasol', 'manali', 'shimla', 'goa', 'jaipur', 'udaipur', 'munnar', 'coorg', 
        'ooty', 'rishikesh', 'nainital', 'alibaug', 'bangalore', 'mumbai', 'delhi', 'kolkata'];
      const foundCity = indianCities.find(c => q.includes(c));
      if (foundCity) {
        filters.city = foundCity.charAt(0).toUpperCase() + foundCity.slice(1);
      } else {
        filters.search = query;
      }
    }

    const dbFilter = { status: 'Active' };
    if (filters.city) dbFilter.city = { $regex: filters.city, $options: 'i' };
    if (filters.state) dbFilter.state = { $regex: filters.state, $options: 'i' };
    if (filters.type) dbFilter.type = filters.type;
    if (filters.minPrice || filters.maxPrice) {
      dbFilter.price = {};
      if (filters.minPrice) dbFilter.price.$gte = Number(filters.minPrice);
      if (filters.maxPrice) dbFilter.price.$lte = Number(filters.maxPrice);
    }
    if (filters.guests) dbFilter.capacity = { $gte: Number(filters.guests) };
    if (filters.search && !filters.city) {
      dbFilter.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } },
        { city: { $regex: filters.search, $options: 'i' } }
      ];
    }

    const properties = await Property.find(dbFilter).sort({ hasActiveOffer: -1, createdAt: -1 }).limit(20);
    const formatted = properties.map((p, i) => ({
      _id: p._id,
      propertyNo: p.propertyNo || `PR-${1000 + i}`,
      image: p.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      images: p.images && p.images.length > 0 ? p.images : [],
      propertyName: p.name,
      location: p.location,
      category: p.type,
      bestRoomRate: p.price,
      rooms: p.bedRooms,
      guests: p.capacity,
      rating: p.rating,
      status: p.status,
      hasActiveOffer: p.hasActiveOffer
    }));

    res.json({
      properties: formatted,
      total: formatted.length,
      extractedFilters: filters,
      aiPowered: !!geminiKey
    });
  } catch (err) {
    res.status(500).json({ message: 'AI search failed', error: err.message });
  }
});

export default router;

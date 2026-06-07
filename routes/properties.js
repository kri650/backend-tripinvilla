import express from 'express';
import Property from '../models/Property.js';
import PropertyRequest from '../models/PropertyRequest.js';
import PropertyLandmark from '../models/PropertyLandmark.js';
import { protect, ownerOnly } from '../middleware/auth.js';
import { syncPropertyMasters, syncRoomMasters } from '../utils/masterSync.js';

const router = express.Router();

const cleanRuleText = (rules) => {
  if (typeof rules !== 'string') return '';
  return rules
    .split('\n')
    .map(rule => rule.replace(/^[•\-\*]\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
};

const normalizeEmbeddedRoom = (room) => ({
  roomType: room.roomType || room.room_type || 'Deluxe',
  roomName: room.roomName || room.room_type || room.roomType || '',
  imageUrl: room.imageUrl || room.room_image_url || room.img || '',
  pricePerNight: Number(room.pricePerNight ?? room.price_per_room ?? room.price ?? 0),
  maxGuests: Number(room.maxGuests ?? room.max_guests ?? room.capacity ?? 2),
  bedType: room.bedType || room.bed_type || 'Double',
  count: Number(room.count ?? 1),
  amenities: Array.isArray(room.amenities)
    ? room.amenities
    : Array.isArray(room.amenities_types)
      ? room.amenities_types
      : [],
  checkIn: room.checkIn || room.checkin_time || '',
  checkOut: room.checkOut || room.checkout_time || '',
  offer: room.offer || (Array.isArray(room.offers) ? room.offers[0] || '' : ''),
  rules: cleanRuleText(room.rules)
});

const roomToRequestPayload = ({ room, property, reqUser, ownerName, ownerContact, isAdmin }) => {
  const normalized = normalizeEmbeddedRoom(room);
  return {
    property: property._id,
    property_id: property._id,
    propertyName: property.name,
    location: property.location,
    category: property.type,
    ownerName: ownerName || reqUser.name || 'Owner',
    ownerContact: ownerContact || reqUser.phone || reqUser.email || 'N/A',
    priceByOwner: normalized.pricePerNight,
    room_type: normalized.roomType,
    bed_type: normalized.bedType,
    price_per_room: normalized.pricePerNight,
    room_image_url: normalized.imageUrl,
    room_images: normalized.imageUrl ? [normalized.imageUrl] : [],
    amenities_types: normalized.amenities,
    offers: normalized.offer ? [normalized.offer] : [],
    checkin_time: normalized.checkIn || property.checkIn,
    checkout_time: normalized.checkOut || property.checkOut,
    rules: (() => {
      const rulePoints = normalized.rules 
        ? normalized.rules.split('\n').filter(Boolean) 
        : [];
      return rulePoints.length > 0 
        ? [{ title: 'Property Rules', points: rulePoints }] 
        : [];
    })(),
    admin_status: isAdmin ? 'approved' : 'pending',
    status: isAdmin ? 'Accepted' : 'pending'
  };
};

const syncEmbeddedRoomsToRequests = async ({ property, rooms, reqUser, ownerName, ownerContact, isAdmin }) => {
  if (!Array.isArray(rooms)) return;
  const PropertyRequest = (await import('../models/PropertyRequest.js')).default;
  let reqCount = await PropertyRequest.countDocuments();

  for (const room of rooms) {
    const payload = roomToRequestPayload({ room, property, reqUser, ownerName, ownerContact, isAdmin });
    const requestId = room._requestId || room.requestId || room._id;
    const query = requestId && /^[a-fA-F0-9]{24}$/.test(String(requestId))
      ? { _id: requestId }
      : {
          $or: [{ property: property._id }, { property_id: property._id }],
          room_type: payload.room_type,
          price_per_room: payload.price_per_room
        };

    const existing = await PropertyRequest.findOne(query);
    if (existing) {
      Object.assign(existing, payload);
      if (!isAdmin) {
        existing.admin_status = 'pending';
        existing.status = 'pending';
      }
      await existing.save();
    } else {
      reqCount++;
      await PropertyRequest.create({
        requestNo: `REQ-${3000 + reqCount}`,
        ...payload
      });
    }

    await syncRoomMasters({
      room_type: payload.room_type,
      amenities_types: payload.amenities_types
    });
  }
};

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
    const { status, type, city, search, date, dateFrom, dateTo, minPrice, maxPrice, guests, limit = 50, page = 1 } = req.query;
    const filter = {};
    if (status && status !== 'All') {
      filter.status = status;
    } else if (!status) {
      filter.status = 'Active';
    }
    if (type) filter.type = { $regex: new RegExp(`^${type}$`, 'i') };
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
    } else if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        filter.createdAt.$gte = startDate;
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = endDate;
      }
    }

    const propertiesDb = await Property.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ priority: -1, hasActiveOffer: -1, createdAt: -1 })
      .populate('experiences')
      .populate('owner', 'name phone email');

    const total = await Property.countDocuments(filter);

    const [totalProperties, activeProperties, inactiveAdmin] = await Promise.all([
      Property.countDocuments(),
      Property.countDocuments({ status: 'Active' }),
      Property.countDocuments({ status: 'Inactive Admin' })
    ]);

    let formattedProperties = propertiesDb.map((p, index) => {
      const pObj = p.toObject();
      return {
        ...pObj,
        _id: p._id,
        propertyNo: p.propertyNo || `PR-${1000 + index}`,
        image: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
        images: p.images && p.images.length > 0 ? p.images : [],
        propertyName: p.name,
        location: p.location || `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
        category: p.type || 'Villa',
        bestRoomRate: p.price || 1200,
        rooms: p.bedRooms || 3,
        roomsList: Array.isArray(pObj.rooms) ? pObj.rooms : [],
        roomsCount: Array.isArray(pObj.rooms) && pObj.rooms.length > 0
          ? pObj.rooms.reduce((totalRooms, room) => totalRooms + (Number(room.count) || 1), 0)
          : (p.bedRooms || 3),
        guests: p.capacity || 2,
        rating: p.rating || 4.5,
        status: p.status || 'Active',
        hasActiveOffer: p.hasActiveOffer || false,
        experiences: p.experiences || [],
        createdAt: p.createdAt,
        ownerName: p.owner ? p.owner.name : (p.ownerContact || 'Unknown'),
        ownerContact: p.owner ? p.owner.phone || p.owner.email : 'No contact'
      };
    });

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

// GET recommended properties (Admins or Subscribed Owners)
router.get('/recommended', async (req, res) => {
  try {
    const { default: User } = await import('../models/User.js');
    const eligibleUsers = await User.find({
      $or: [
        { role: { $in: ['admin', 'super_admin'] } },
        { isPremium: true },
        { 'subscription.isActive': true }
      ]
    }).select('_id');

    const eligibleUserIds = eligibleUsers.map(u => u._id);

    const properties = await Property.find({ owner: { $in: eligibleUserIds }, status: 'Active' })
      .populate('owner', 'name phone email role isPremium subscription')
      .limit(20)
      .sort({ priority: -1, createdAt: -1 });

    const formatted = properties.map((p, index) => {
      const pObj = p.toObject();
      return {
        ...pObj,
        id: p._id,
        name: p.name,
        location: p.location || `${p.city || ''}${p.state ? ', ' + p.state : ''}`,
        price: p.price || 1200,
        img: p.images && p.images[0] ? p.images[0] : 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
        guests: p.capacity || 3,
        rooms: p.bedRooms || 1,
        area: pObj.area || '300 sq. ft.'
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET top 10 by bookings
router.get('/top', async (req, res) => {
  try {
    const properties = await Property.find({ status: 'Active' }).sort({ priority: -1, totalBookings: -1 }).limit(10);
    res.json(properties);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

import upload from '../middleware/upload.js';
import { checkPhotoLimit } from '../middleware/subscriptionMiddleware.js';

// POST upload images — MUST be before /:id to avoid being caught by it
router.post('/upload', protect, ownerOnly, checkPhotoLimit, upload.array('images', 100), (req, res) => {
  try {
    const incomingFilesCount = req.files ? req.files.length : 0;
    
    // checkPhotoLimit sets req.photoLimit
    if (incomingFilesCount > req.photoLimit) {
      return res.status(403).json({
        message: `You can only upload ${req.photoLimit} more photos. Subscribe to upload unlimited photos.`
      });
    }

    const filePaths = req.files.map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
    res.json({ urls: filePaths });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/properties/owner -> Fetch owner's property list — MUST be before /:id
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).populate('experiences').sort({ createdAt: -1 });
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
    // 1st: Check the PropertyLandmark collection
    let landmarks = await PropertyLandmark.find({ property_id: req.params.id });
    if (!landmarks || landmarks.length === 0) {
      // 2nd: Fallback to Property.landmarks embedded array
      const property = await Property.findById(req.params.id);
      if (property && Array.isArray(property.landmarks) && property.landmarks.length > 0) {
        landmarks = property.landmarks;
      }
    }
    if (!landmarks || landmarks.length === 0) {
      // 3rd: Fallback to PropertyMaster.landmarks (added by admin)
      try {
        const { default: PropertyMaster } = await import('../models/PropertyMaster.js');
        const master = await PropertyMaster.findOne({ linkedPropertyId: req.params.id });
        if (master && Array.isArray(master.landmarks) && master.landmarks.length > 0) {
          landmarks = master.landmarks.map(lm => ({
            landmark_name: lm.landmark_name || lm.name || '',
            landmark_type: lm.landmark_type || lm.type || lm.label || '',
            landmark_image_url: lm.landmark_image_url || lm.img || lm.image || '',
            distance: lm.distance || ''
          }));
        }
      } catch (e) { /* PropertyMaster may not exist */ }
    }
    res.json(landmarks || []);
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
    const property = await Property.findById(req.params.id).populate('experiences');
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
    
    const sanitizeObjId = (id) => (typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) ? id : undefined;
    if ('countryId' in body) body.countryId = sanitizeObjId(body.countryId);
    if ('stateId' in body) body.stateId = sanitizeObjId(body.stateId);
    if ('cityId' in body) body.cityId = sanitizeObjId(body.cityId);
    if ('locationId' in body) body.locationId = sanitizeObjId(body.locationId);
    if (Array.isArray(body.experiences)) {
      body.experiences = body.experiences.filter(exp => sanitizeObjId(exp));
    } else {
      delete body.experiences;
    }
    
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
    let isPremiumOwner = req.user.isPremium || false;

    const User = (await import('../models/User.js')).default;
    if (isAdmin && (body.owner || body.ownerId)) {
      const targetOwnerId = body.owner || body.ownerId;
      ownerId = targetOwnerId;
      try {
        const ownerUser = await User.findById(targetOwnerId);
        if (ownerUser) {
          ownerName = ownerUser.name;
          ownerContact = ownerUser.phone || ownerUser.email || 'N/A';
          isPremiumOwner = ownerUser.isPremium || false;
        }
      } catch (err) {}
    } else if (!isAdmin) {
      try {
        const currentUser = await User.findById(ownerId);
        if (currentUser) isPremiumOwner = currentUser.isPremium || false;
      } catch (err) {}
    }

    if (String(ownerId) === 'fake_admin_123') ownerId = '507f1f77bcf86cd799439011';
    if (String(ownerId) === 'fake_owner_123') ownerId = '507f1f77bcf86cd799439012';

    // Admin creates properties as Active; owners go through Pending/approval
    const initialStatus = isAdmin ? 'Active' : 'Pending';

    const propertyData = {
      propertyNo: `PR-${1000 + count + 1}`,
      ...body,
      owner: ownerId,
      status: initialStatus,
      priority: isPremiumOwner || isAdmin ? 1 : 0
    };
    const property = await Property.create(propertyData);
    
    // Sync masters async (fire and forget is okay, but await ensures it happens before respond)
    await syncPropertyMasters(propertyData);

    if (Array.isArray(body.rooms) && body.rooms.length > 0) {
      await syncEmbeddedRoomsToRequests({
        property,
        rooms: body.rooms,
        reqUser: req.user,
        ownerName,
        ownerContact,
        isAdmin
      });
    }

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
    if (!isAdmin) delete body.status; // Prevent owner from bypassing admin approval via generic update
    if (body.price_per_night !== undefined) body.price = Number(body.price_per_night);
    if (body.bedrooms !== undefined) body.bedRooms = Number(body.bedrooms);
    if (body.address !== undefined) body.location = body.address;

    const sanitizeObjId = (id) => (typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id)) ? id : undefined;
    if ('countryId' in body) body.countryId = sanitizeObjId(body.countryId);
    if ('stateId' in body) body.stateId = sanitizeObjId(body.stateId);
    if ('cityId' in body) body.cityId = sanitizeObjId(body.cityId);
    if ('locationId' in body) body.locationId = sanitizeObjId(body.locationId);
    if (Array.isArray(body.experiences)) {
      body.experiences = body.experiences.filter(exp => sanitizeObjId(exp));
    } else {
      delete body.experiences;
    }

    const incomingRooms = Array.isArray(body.rooms) ? body.rooms : null;
    if (incomingRooms) body.rooms = incomingRooms.map(normalizeEmbeddedRoom);

    Object.assign(property, body);
    await property.save();
    
    // Sync masters async
    await syncPropertyMasters(body);

    if (incomingRooms) {
      await syncEmbeddedRoomsToRequests({
        property,
        rooms: incomingRooms,
        reqUser: req.user,
        ownerName: property.ownerName || req.user.name,
        ownerContact: property.ownerContact || req.user.phone || req.user.email || 'N/A',
        isAdmin
      });

      if (!isAdmin) {
        property.status = 'Pending';
        await property.save();
      }
    }
    
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
    if (filters.type) dbFilter.type = { $regex: new RegExp(`^${filters.type}$`, 'i') };
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

    const properties = await Property.find(dbFilter).sort({ priority: -1, hasActiveOffer: -1, createdAt: -1 }).limit(20).populate('experiences');
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
      hasActiveOffer: p.hasActiveOffer,
      experiences: p.experiences || []
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

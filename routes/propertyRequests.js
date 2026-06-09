import express from 'express';
import PropertyRequest from '../models/PropertyRequest.js';
import Property from '../models/Property.js';
import { protect, ownerOnly, adminOnly } from '../middleware/auth.js';
import { syncRoomMasters } from '../utils/masterSync.js';

const router = express.Router();

const normalizeRuleSections = (rules) => {
  if (!Array.isArray(rules)) return [];

  return rules
    .map(rule => {
      const rawPoints = Array.isArray(rule.points)
        ? rule.points
        : typeof rule.text === 'string'
          ? rule.text.split('\n')
          : typeof rule.points === 'string'
            ? rule.points.split('\n')
            : [];

      const points = rawPoints
        .map(point => String(point || '').replace(/^[•\-\*]\s*/, '').trim())
        .filter(Boolean);

      return {
        title: String(rule.title || '').trim(),
        points
      };
    })
    .filter(rule => rule.title || rule.points.length > 0);
};

const normalizeOfferList = (room = {}) => {
  const rawOffers = Array.isArray(room.offers)
    ? room.offers
    : Array.isArray(room.offersList)
      ? room.offersList
      : room.offer
        ? [room.offer]
        : [];

  return rawOffers
    .map(offer => String(offer || '').trim())
    .filter(Boolean);
};

const normalizeRoomEntry = (room = {}) => ({
  room_type: room.room_type || '',
  room_image_url: room.room_image_url || '',
  room_images: Array.isArray(room.room_images) ? room.room_images : (room.room_image_url ? [room.room_image_url] : []),
  bed_type: room.bed_type || '',
  amenities_types: Array.isArray(room.amenities_types) ? room.amenities_types : [],
  experiences: Array.isArray(room.experiences) ? room.experiences : [],
  original_price: room.original_price != null ? Number(room.original_price) : undefined,
  price_per_room: room.price_per_room != null ? Number(room.price_per_room) : undefined,
  tax_amount: room.tax_amount != null ? Number(room.tax_amount) : undefined,
  checkin_time: '',
  checkout_time: '',
  offers: normalizeOfferList(room),
  rules: normalizeRuleSections(room.rules)
});

const getRoomsFromRequest = (request) => {
  if (Array.isArray(request.rooms) && request.rooms.length > 0) {
    return request.rooms.map(normalizeRoomEntry);
  }
  if (request.room_type || request.price_per_room) {
    return [normalizeRoomEntry(request)];
  }
  return [];
};

const roomToPropertyRoom = (room, requestId) => ({
  roomType: room.room_type || 'Deluxe Room',
  roomName: room.room_type || 'Deluxe Room',
  imageUrl: room.room_image_url || (Array.isArray(room.room_images) ? room.room_images[0] : ''),
  pricePerNight: Number(room.price_per_room) || 0,
  originalPrice: room.original_price != null ? Number(room.original_price) : undefined,
  taxAmount: room.tax_amount != null ? Number(room.tax_amount) : 0,
  maxGuests: 2,
  bedType: room.bed_type || '',
  count: 1,
  amenities: Array.isArray(room.amenities_types) ? room.amenities_types : [],
  checkIn: '',
  checkOut: '',
  offer: Array.isArray(room.offers) ? room.offers[0] || '' : '',
  rules: normalizeRuleSections(room.rules)
    .flatMap(rule => rule.points)
    .join('\n'),
  requestId
});

const syncAcceptedRoomToProperty = async (request) => {
  const propId = request.property || request.property_id;
  if (!propId) return;

  const property = await Property.findById(propId);
  if (!property) return;

  const requestRooms = getRoomsFromRequest(request);
  const propertyRooms = Array.isArray(property.rooms)
    ? property.rooms.map(r => (r.toObject ? r.toObject() : r))
    : [];

  for (const roomData of requestRooms) {
    const room = roomToPropertyRoom(roomData, request._id);
    const roomIndex = propertyRooms.findIndex(existing => {
      const sameType = String(existing.roomType || '').toLowerCase() === String(room.roomType || '').toLowerCase();
      const samePrice = Number(existing.pricePerNight || 0) === Number(room.pricePerNight || 0);
      return sameType && samePrice;
    });

    if (roomIndex >= 0) propertyRooms[roomIndex] = { ...propertyRooms[roomIndex], ...room };
    else propertyRooms.push(room);
  }

  property.rooms = propertyRooms;
  property.status = 'Active';

  // ✅ SYNC: Update property top-level price & originalPrice from rooms
  const allRoomPrices = propertyRooms.map(r => Number(r.pricePerNight || 0)).filter(Boolean);
  const allOriginalPrices = propertyRooms.map(r => Number(r.originalPrice || 0)).filter(Boolean);
  if (allRoomPrices.length > 0) {
    property.price = Math.min(...allRoomPrices);
    property.price_per_night = Math.min(...allRoomPrices);
  }
  if (allOriginalPrices.length > 0) {
    property.originalPrice = Math.max(...allOriginalPrices);
  }

  await property.save();
};

const formatGuestRoom = (requestDoc, room, idx) => ({
  _id: requestDoc._id,
  roomIndex: idx,
  title: room.room_type || 'Deluxe Room',
  img: room.room_image_url || (requestDoc.property?.images && requestDoc.property.images.length > 0 ? requestDoc.property.images[0] : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80'),
  images: room.room_images && room.room_images.length > 0 ? room.room_images : (room.room_image_url ? [room.room_image_url] : []),
  features: [...(room.amenities_types || [])],
  offers: room.offers || [],
  beds: room.bed_type || '2 Beds',
  rooms: '1 Room',
  guests: '3 Person',
  originalPrice: room.original_price,
  price: room.price_per_room || 1400,
  checkIn: room.checkin_time,
  checkOut: room.checkout_time,
  tax_amount: room.tax_amount,
  roomName: room.room_type || 'Deluxe Room',
  rules: normalizeRuleSections(room.rules)
});

const formatAdminRequest = (r) => {
  const rooms = getRoomsFromRequest(r);
  const firstRoom = rooms[0] || {};
  const prices = rooms.map(room => Number(room.price_per_room || 0)).filter(Boolean);
  const minPrice = prices.length > 0 ? Math.min(...prices) : (r.price_per_room || r.priceByOwner);

  return {
    _id: r._id,
    requestNo: r.requestNo,
    image: firstRoom.room_image_url || r.room_image_url || r.image || (r.property?.images && r.property.images[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
    propertyName: r.property?.name || r.propertyName,
    location: r.property?.location || r.location,
    category: r.property?.type || r.category,
    ownerName: r.ownerName,
    ownerContact: r.ownerContact,
    priceByOwner: minPrice,
    about: r.property?.description || '',
    status: r.admin_status === 'approved' ? 'Accepted' : (r.admin_status === 'rejected' ? 'Rejected' : 'NotAccepted'),
    createdAt: r.createdAt,
    roomCount: rooms.length,
    rooms,
    room_type: firstRoom.room_type || r.room_type,
    bed_type: firstRoom.bed_type || r.bed_type,
    amenities_types: firstRoom.amenities_types || r.amenities_types || [],
    original_price: firstRoom.original_price ?? r.original_price,
    price_per_room: firstRoom.price_per_room ?? r.price_per_room,
    checkin_time: firstRoom.checkin_time || r.checkin_time,
    checkout_time: firstRoom.checkout_time || r.checkout_time,
    offers: firstRoom.offers || r.offers || [],
    rules: normalizeRuleSections(firstRoom.rules?.length ? firstRoom.rules : r.rules),
    room_image_url: firstRoom.room_image_url || r.room_image_url,
    room_images: firstRoom.room_images || r.room_images || [],
    tax_amount: firstRoom.tax_amount ?? r.tax_amount,
    property_id: r.property?._id || r.property_id
  };
};

// GET all property requests (Admin View)
// GET /api/property-requests
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const requestsDb = await PropertyRequest.find()
      .populate('property', 'name location city type description images')
      .sort({ createdAt: -1 });

    const [totalProperties, pendingRequests, rejectedRequests] = await Promise.all([
      Property.countDocuments(),
      PropertyRequest.countDocuments({ admin_status: 'pending' }),
      PropertyRequest.countDocuments({ admin_status: 'rejected' })
    ]);

    const formattedRequests = requestsDb.map(formatAdminRequest);

    res.json({
      requests: formattedRequests,
      stats: {
        totalProperties,
        pendingRequests,
        rejectedRequests
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/property-requests/:id/accept -> Approve request (Admin View)
router.put('/:id/accept', protect, adminOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = 'approved';
    request.status = 'Accepted';
    await request.save();
    
    // Update the property status to Active
    if (request.property || request.property_id) {
      await syncAcceptedRoomToProperty(request);
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/property-requests/:id/reject -> Reject request (Admin View)
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = 'rejected';
    request.status = 'Rejected';
    await request.save();
    
    // Update the property status to Inactive Admin
    if (request.property || request.property_id) {
      const propId = request.property || request.property_id;
      await Property.findByIdAndUpdate(propId, { status: 'Inactive Admin' });
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/property-requests/owner -> Fetch owner's requests list
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);
    
    const requests = await PropertyRequest.find({
      $or: [
        { property: { $in: propertyIds } },
        { property_id: { $in: propertyIds } }
      ]
    })
      .populate('property', 'name location city type images')
      .sort({ createdAt: -1 });
      
    const formatted = requests.map(r => {
      const obj = r.toObject();
      const rooms = getRoomsFromRequest(r);
      const firstRoom = rooms[0] || {};
      return {
        ...obj,
        id: r._id,
        property_id: r.property?._id || r.property_id,
        propertyName: r.property?.name || r.propertyName,
        category: r.property?.type || r.category,
        roomCount: rooms.length,
        rooms,
        room_type: firstRoom.room_type || r.room_type,
        room_image_url: firstRoom.room_image_url || r.room_image_url,
        bed_type: firstRoom.bed_type || r.bed_type,
        amenities_types: firstRoom.amenities_types || r.amenities_types,
        original_price: firstRoom.original_price ?? r.original_price,
        price_per_room: firstRoom.price_per_room ?? r.price_per_room,
        checkin_time: firstRoom.checkin_time || r.checkin_time,
        checkout_time: firstRoom.checkout_time || r.checkout_time,
        offers: firstRoom.offers || r.offers,
        room_images: firstRoom.room_images || r.room_images || [],
        tax_amount: firstRoom.tax_amount ?? r.tax_amount,
        rules: normalizeRuleSections(firstRoom.rules?.length ? firstRoom.rules : r.rules),
        admin_status: r.admin_status || 'pending'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/property-requests/admin-direct -> Admin creates an auto-approved room
import { upload } from '../middleware/upload.js';
router.post('/admin-direct', protect, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const { property_id, room_type, room_image_url, bed_type, original_price, tax_amount, price_per_room, checkin_time, checkout_time } = req.body;
    let { room_images, amenities_types, offers } = req.body;
    
    // Parse arrays if sent as strings (FormData)
    if (typeof room_images === 'string') { try { room_images = JSON.parse(room_images); } catch(e) { room_images = [room_images]; } }
    if (typeof amenities_types === 'string') { try { amenities_types = JSON.parse(amenities_types); } catch(e) { amenities_types = [amenities_types]; } }
    if (typeof offers === 'string') { try { offers = JSON.parse(offers); } catch(e) { offers = [offers]; } }

    const property = await Property.findById(property_id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const count = await PropertyRequest.countDocuments();
    const requestNo = `REQ-${3000 + count + 1}`;

    const existingImgs = Array.isArray(room_images) && room_images.length > 0 ? room_images : (room_image_url ? [room_image_url] : []);
    const uploadedImgs = req.files ? req.files.map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`) : [];
    const imgs = [...existingImgs, ...uploadedImgs];

    const firstRoomData = {
      room_type,
      room_image_url: imgs[0] || '',
      room_images: imgs,
      bed_type,
      amenities_types: Array.isArray(amenities_types) ? amenities_types : [],
      original_price: original_price ? Number(original_price) : undefined,
      tax_amount: tax_amount ? Number(tax_amount) : undefined,
      price_per_room: Number(price_per_room),
      checkin_time,
      checkout_time,
      offers: Array.isArray(offers) ? offers : []
    };

    const existingRequest = await PropertyRequest.findOne({
      $or: [{ property: property_id }, { property_id: property_id }]
    });

    let result;
    if (existingRequest) {
      const rooms = getRoomsFromRequest(existingRequest);
      rooms.push(normalizeRoomEntry(firstRoomData));
      
      existingRequest.rooms = rooms;
      // Also update top-level fields with the newest room if needed, or keep the old ones. 
      // Usually we keep the old ones as "primary" or update to newest. Let's update to newest for direct admin action.
      Object.assign(existingRequest, {
        ...firstRoomData,
        priceByOwner: Number(price_per_room),
        admin_status: 'approved',
        status: 'Accepted'
      });
      result = await existingRequest.save();
    } else {
      result = await PropertyRequest.create({
        requestNo,
        property: property_id,
        property_id,
        propertyName: property.name,
        location: property.location,
        category: property.type,
        ownerName: property.ownerName || 'Admin',
        ownerContact: 'admin',
        priceByOwner: Number(price_per_room),
        ...firstRoomData,
        rooms: [normalizeRoomEntry(firstRoomData)],
        admin_status: 'approved',
        status: 'Accepted'
      });
    }

    await syncRoomMasters({ room_type, amenities_types, experiences: req.body.experiences });
    await syncAcceptedRoomToProperty(result);

    res.status(existingRequest ? 200 : 201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/property-requests/admin-direct/:id -> Admin updates a room
router.put('/admin-direct/:id', protect, adminOnly, upload.array('images', 10), async (req, res) => {
  try {
    const { room_type, room_image_url, bed_type, original_price, price_per_room, checkin_time, checkout_time } = req.body;
    let { room_images, amenities_types, offers } = req.body;
    
    // Parse arrays if sent as strings (FormData)
    if (typeof room_images === 'string') { try { room_images = JSON.parse(room_images); } catch(e) { room_images = [room_images]; } }
    if (typeof amenities_types === 'string') { try { amenities_types = JSON.parse(amenities_types); } catch(e) { amenities_types = [amenities_types]; } }
    if (typeof offers === 'string') { try { offers = JSON.parse(offers); } catch(e) { offers = [offers]; } }

    const existingImgs = Array.isArray(room_images) && room_images.length > 0 ? room_images : (room_image_url ? [room_image_url] : []);
    const uploadedImgs = req.files ? req.files.map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`) : [];
    const imgs = [...existingImgs, ...uploadedImgs];

    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Room not found' });
    
    let { room_index } = req.body;
    let roomUpdated = false;

    if (room_index !== undefined && room_index !== null) {
      const idx = Number(room_index);
      if (idx >= 0 && idx < request.rooms.length) {
        request.rooms[idx] = {
          ...request.rooms[idx].toObject ? request.rooms[idx].toObject() : request.rooms[idx],
          room_type,
          room_image_url: imgs[0] || '',
          room_images: imgs,
          bed_type,
          amenities_types: Array.isArray(amenities_types) ? amenities_types : [],
          original_price: original_price ? Number(original_price) : undefined,
          tax_amount: req.body.tax_amount ? Number(req.body.tax_amount) : undefined,
          price_per_room: Number(price_per_room),
          checkin_time,
          checkout_time,
          offers: Array.isArray(offers) ? offers : []
        };
        roomUpdated = true;
      }
    }

    if (!roomUpdated && request.rooms.length > 0) {
      // Fallback: update first room if no index provided
      request.rooms[0] = {
        ...request.rooms[0].toObject ? request.rooms[0].toObject() : request.rooms[0],
        room_type,
        room_image_url: imgs[0] || '',
        room_images: imgs,
        bed_type,
        amenities_types: Array.isArray(amenities_types) ? amenities_types : [],
        original_price: original_price ? Number(original_price) : undefined,
        tax_amount: req.body.tax_amount ? Number(req.body.tax_amount) : undefined,
        price_per_room: Number(price_per_room),
        checkin_time,
        checkout_time,
        offers: Array.isArray(offers) ? offers : []
      };
    }

    request.room_type = room_type;
    request.room_image_url = imgs[0] || '';
    request.room_images = imgs;
    request.bed_type = bed_type;
    request.amenities_types = Array.isArray(amenities_types) ? amenities_types : [];
    request.original_price = original_price ? Number(original_price) : undefined;
    if (req.body.tax_amount) request.tax_amount = Number(req.body.tax_amount);
    request.price_per_room = Number(price_per_room);
    request.priceByOwner = Number(price_per_room);
    request.checkin_time = checkin_time;
    request.checkout_time = checkout_time;
    request.offers = Array.isArray(offers) ? offers : [];

    const updated = await request.save();

    if (!updated) return res.status(404).json({ message: 'Room not found' });
    
    await syncRoomMasters({ room_type, amenities_types, experiences: req.body.experiences });
    await syncAcceptedRoomToProperty(updated);
    
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /api/property-requests/property/:propertyId -> Public approved rooms for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    const requests = await PropertyRequest.find({
      $or: [
        { property: req.params.propertyId },
        { property_id: req.params.propertyId }
      ],
      admin_status: 'approved'
    }).populate('property', 'images');
    const formatted = requests.flatMap(r =>
      getRoomsFromRequest(r).map((room, idx) => formatGuestRoom(r, room, idx))
    );
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// POST /api/property-requests -> Submit request (single or multiple rooms in one request)
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const { property_id, rooms: roomsPayload } = req.body;
    const {
      room_type, room_image_url, bed_type, amenities_types, original_price,
      price_per_room, tax_amount, checkin_time, checkout_time, offers, rules
    } = req.body;

    const property = await Property.findOne({ _id: property_id, owner: req.user._id });
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });

    const normalizedRooms = Array.isArray(roomsPayload) && roomsPayload.length > 0
      ? roomsPayload.map(normalizeRoomEntry)
      : [normalizeRoomEntry({
          room_type, room_image_url, bed_type, amenities_types, original_price,
          price_per_room, tax_amount, checkin_time, checkout_time, offers, rules,
          experiences: req.body.experiences
        })];

    if (!normalizedRooms.length || !normalizedRooms[0].room_type || !normalizedRooms[0].price_per_room) {
      return res.status(400).json({ message: 'At least one valid room with room type and price is required' });
    }

    const firstRoom = normalizedRooms[0];
    const prices = normalizedRooms.map(room => Number(room.price_per_room || 0)).filter(Boolean);

    // ✅ Check for existing request for this property to avoid duplicates
    const existingRequest = await PropertyRequest.findOne({
      $or: [{ property: property_id }, { property_id: property_id }]
    });

    let result;
    if (existingRequest) {
      // Get existing rooms and merge with new rooms (append, don't replace)
      const existingRooms = getRoomsFromRequest(existingRequest);
      // Merge: add new rooms that don't already exist (by room_type)
      const mergedRooms = [...existingRooms];
      for (const newRoom of normalizedRooms) {
        const existingIndex = mergedRooms.findIndex(r => 
          String(r.room_type || '').toLowerCase() === String(newRoom.room_type || '').toLowerCase()
        );
        if (existingIndex >= 0) {
          mergedRooms[existingIndex] = newRoom; // Update existing room
        } else {
          mergedRooms.push(newRoom); // Add new room
        }
      }
      existingRequest.rooms = mergedRooms;
      existingRequest.room_type = firstRoom.room_type;
      existingRequest.room_image_url = firstRoom.room_image_url;
      existingRequest.bed_type = firstRoom.bed_type;
      existingRequest.amenities_types = firstRoom.amenities_types;
      existingRequest.original_price = firstRoom.original_price;
      existingRequest.price_per_room = firstRoom.price_per_room;
      existingRequest.tax_amount = firstRoom.tax_amount;
      existingRequest.checkin_time = firstRoom.checkin_time;
      existingRequest.checkout_time = firstRoom.checkout_time;
      existingRequest.offers = firstRoom.offers;
      existingRequest.rules = firstRoom.rules;
      existingRequest.priceByOwner = prices.length > 0 ? Math.min(...prices) : Number(firstRoom.price_per_room);
      existingRequest.admin_status = 'pending';
      existingRequest.status = 'pending';
      result = await existingRequest.save();
    } else {
      const count = await PropertyRequest.countDocuments();
      const requestNo = `REQ-${3000 + count + 1}`;
      result = await PropertyRequest.create({
        requestNo,
        property: property_id,
        property_id,
        propertyName: property.name,
        location: property.location,
        category: property.type,
        ownerName: req.user.name,
        ownerContact: req.user.phone || req.user.email || 'N/A',
        priceByOwner: prices.length > 0 ? Math.min(...prices) : Number(firstRoom.price_per_room),
        rooms: normalizedRooms,
        room_type: firstRoom.room_type,
        room_image_url: firstRoom.room_image_url,
        bed_type: firstRoom.bed_type,
        amenities_types: firstRoom.amenities_types,
        original_price: firstRoom.original_price,
        price_per_room: firstRoom.price_per_room,
        tax_amount: firstRoom.tax_amount,
        checkin_time: firstRoom.checkin_time,
        checkout_time: firstRoom.checkout_time,
        offers: firstRoom.offers,
        rules: firstRoom.rules,
        admin_status: 'pending',
        status: 'pending'
      });
    }

    for (const room of normalizedRooms) {
      await syncRoomMasters({
        room_type: room.room_type,
        amenities_types: room.amenities_types,
        experiences: room.experiences
      });
    }

    res.status(existingRequest ? 200 : 201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/property-requests/:id -> Owner edits their request
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const { room_type, room_image_url, bed_type, amenities_types, original_price, price_per_room, checkin_time, checkout_time, offers, rules, tax_amount } = req.body;
    
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    
    // Ensure the owner owns the associated property
    const property = await Property.findOne({ _id: request.property || request.property_id, owner: req.user._id });
    if (!property) return res.status(403).json({ message: 'Access denied' });

    const updateData = {
      room_type,
      room_image_url,
      bed_type,
      amenities_types: Array.isArray(amenities_types) ? amenities_types : [],
      original_price: original_price ? Number(original_price) : undefined,
      price_per_room: Number(price_per_room),
      tax_amount: tax_amount ? Number(tax_amount) : undefined,
      priceByOwner: Number(price_per_room),
      checkin_time,
      checkout_time,
      offers: Array.isArray(offers) ? offers : [],
      rules: normalizeRuleSections(rules),
      admin_status: 'pending',
      status: 'pending'
    };

    if (req.body.rooms && Array.isArray(req.body.rooms)) {
      const newRooms = req.body.rooms.map(normalizeRoomEntry);
      const existingRooms = getRoomsFromRequest(request);
      const mergedRooms = [...existingRooms];

      for (const nr of newRooms) {
        const idx = mergedRooms.findIndex(r => 
          String(r.room_type || '').toLowerCase() === String(nr.room_type || '').toLowerCase()
        );
        if (idx >= 0) {
          mergedRooms[idx] = { ...mergedRooms[idx], ...nr };
        } else {
          mergedRooms.push(nr);
        }
      }
      
      updateData.rooms = mergedRooms;
      if (mergedRooms.length > 0) {
        const first = mergedRooms[0];
        Object.assign(updateData, {
          room_type: first.room_type,
          room_image_url: first.room_image_url,
          bed_type: first.bed_type,
          price_per_room: first.price_per_room,
          original_price: first.original_price,
          tax_amount: first.tax_amount,
          priceByOwner: Number(first.price_per_room)
        });
      }
    }

    const updated = await PropertyRequest.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    await syncRoomMasters(req.body);

    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/property-requests/:id -> Admin approve/reject request
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { admin_status } = req.body;
    if (!admin_status || !['pending', 'approved', 'rejected'].includes(admin_status)) {
      return res.status(400).json({ message: 'Valid admin_status is required' });
    }
    
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = admin_status;
    request.status = admin_status === 'approved' ? 'Accepted' : (admin_status === 'rejected' ? 'Rejected' : 'NotAccepted');
    await request.save();
    
    // Update the property status
    if (request.property || request.property_id) {
      const propertyStatus = admin_status === 'approved' ? 'Active' : (admin_status === 'rejected' ? 'Inactive Admin' : 'Pending');
      if (admin_status === 'approved') {
        await syncAcceptedRoomToProperty(request);
      } else {
        await Property.findByIdAndUpdate(request.property || request.property_id, { status: propertyStatus });
      }
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE request
// DELETE /api/property-requests/:id
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findOneAndDelete({ _id: req.params.id });
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    res.json({ message: 'Property request deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

import express from 'express';
import PropertyMaster from '../../models/PropertyMaster.js';
import PropertyExperienceTag from '../../models/PropertyExperienceTag.js';
import Property from '../../models/Property.js';
import { upload } from '../../middleware/upload.js';
import PropertyTypeMaster from '../../models/PropertyTypeMaster.js';
import RoomTypeMaster from '../../models/RoomTypeMaster.js';
import ExperienceMaster from '../../models/ExperienceMaster.js';

const router = express.Router();

const sanitizeObjectId = (id) => (
  typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id) ? id : undefined
);

const cleanLocationPart = (value) => String(value || '').trim();

const uniqueLocationParts = (parts) => {
  const seen = new Set();
  return parts
    .flatMap(part => cleanLocationPart(part).split(','))
    .map(cleanLocationPart)
    .filter(Boolean)
    .filter(part => {
      const key = part.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const composeLocationString = (data) => (
  uniqueLocationParts([
    data.locationName,
    data.cityName || data.city,
    data.stateName || data.state,
    data.countryName || data.country
  ]).join(', ') || cleanLocationPart(data.location)
);

const normalizePropertyData = (data, defaults = {}) => {
  const location = composeLocationString(data) || data.location || defaults.location || 'Unknown';
  const city = data.cityName || data.city || defaults.city || uniqueLocationParts([location])[1] || location;
  const country = data.countryName || data.country || defaults.country || 'India';

  return {
    ...defaults,
    name: data.propertyName || defaults.name || 'Unnamed Property',
    type: data.propertyType || defaults.type || 'Homestay',
    location,
    city,
    state: data.stateName || data.state || defaults.state,
    country,
    price: Number(data.propertyPrice) || Number(data.price) || defaults.price || 0,
    price_per_night: Number(data.propertyPrice) || Number(data.price_per_night) || defaults.price_per_night || 0,
    originalPrice: data.originalPrice ? Number(data.originalPrice) : defaults.originalPrice,
    ownerContact: data.ownerContact || defaults.ownerContact,
    amenities: Array.isArray(data.amenities) ? data.amenities : (Array.isArray(data.amenityTypes) ? data.amenityTypes : defaults.amenities || []),
    description: data.aboutProperty || data.description || defaults.description,
    images: Array.isArray(data.images) ? data.images.filter(u => u && !u.startsWith('blob:')) : defaults.images || [],
    rooms: Array.isArray(data.rooms) ? data.rooms : defaults.rooms || [],
    otherDetails: Array.isArray(data.otherDetails) ? data.otherDetails : defaults.otherDetails || [],
    checkIn: data.checkIn || defaults.checkIn || '3:00 PM',
    checkOut: data.checkOut || defaults.checkOut || '12:00 PM',
    rules: data.rules || defaults.rules,
    bedRooms: Number(data.bedRooms) || defaults.bedRooms || 1,
    bathRooms: Number(data.bathRooms) || defaults.bathRooms || 1,
    capacity: Number(data.capacity) || defaults.capacity || 2,
    beds: Number(data.beds) || defaults.beds || 1,
    area: data.area || defaults.area,
    status: data.status || defaults.status || 'Active',
    full_address: data.full_address || location,
    highlights: data.highlights || defaults.highlights,
    countryId: sanitizeObjectId(data.countryId),
    countryName: data.countryName || data.country || defaults.countryName || country,
    stateId: sanitizeObjectId(data.stateId),
    stateName: data.stateName || data.state || defaults.stateName,
    cityId: sanitizeObjectId(data.cityId),
    cityName: data.cityName || data.city || defaults.cityName || city,
    locationId: sanitizeObjectId(data.locationId),
    locationName: data.locationName || defaults.locationName,
    foodPreference: data.foodPreference || defaults.foodPreference || 'none',
    roomType: data.roomType || data.stayConfig || defaults.roomType || 'entire-place',
    landmarks: Array.isArray(data.landmarks) ? data.landmarks : defaults.landmarks || [],
    experiences: Array.isArray(data.experiences) ? data.experiences.filter(exp => sanitizeObjectId(String(exp))) : defaults.experiences || [],
    taxAmount: data.taxAmount ? Number(data.taxAmount) : defaults.taxAmount,
    latitude: data.latitude ? Number(data.latitude) : defaults.latitude,
    longitude: data.longitude ? Number(data.longitude) : defaults.longitude,
  };
};

// GET all property master entries
// GET /api/master/properties
router.get('/', async (req, res) => {
  try {
    const propertiesDb = await PropertyMaster.find().sort({ createdAt: -1 }).lean();
    const propertyIds = propertiesDb.map(p => p._id);
    const linkedProperties = await Property.find({ _id: { $in: propertyIds } }).populate('experiences').lean();
    
    const linkedMap = linkedProperties.reduce((acc, p) => { 
      acc[p._id.toString()] = p; 
      return acc; 
    }, {});

    let results = propertiesDb.map(p => {
      const linked = linkedMap[p._id.toString()] || {};
      return {
        _id: p._id,
        propertyNo: p.propertyNo,
        propertyType: p.propertyType,
        propertyName: p.propertyName,
        ownerName: p.ownerName,
        ownerContact: p.ownerContact,
        owner: linked.owner,
        amenityTypes: p.amenityTypes || [],
        amenities: linked.amenities || p.amenityTypes || [],
        location: p.location,
        full_address: linked.full_address || p.full_address || p.location,
        latitude: linked.latitude,
        longitude: linked.longitude,
        propertyPrice: p.propertyPrice,
        originalPrice: p.originalPrice || linked.originalPrice,
        taxAmount: linked.taxAmount || p.taxAmount,
        images: p.images || [],
        videos: p.videos || [],
        aboutProperty: p.aboutProperty,
        status: p.status,
        checkIn: linked.checkIn || '3:00 PM',
        checkOut: linked.checkOut || '12:00 PM',
        area: linked.area || '31 sq. ft.',
        bedRooms: linked.bedRooms || 1,
        beds: linked.beds || 2,
        capacity: linked.capacity || 3,
        bathRooms: linked.bathRooms || 1,
        rules: linked.rules,
        otherDetails: linked.otherDetails || p.otherDetails || [],
        highlights: linked.highlights,
        experiences: linked.experiences || [],
        // ── FIXED: was linked.country (wrong field) ──
        countryId: linked.countryId || p.countryId,
        stateId: linked.stateId || p.stateId,
        cityId: linked.cityId || p.cityId,
        locationId: linked.locationId || p.locationId,
        countryName: linked.countryName || linked.country || p.countryName,
        stateName: linked.stateName || linked.state || p.stateName,
        cityName: linked.cityName || linked.city || p.cityName,
        locationName: linked.locationName || p.locationName,
        // ── ADDED: these were missing from GET response ──
        foodPreference: linked.foodPreference || p.foodPreference || 'none',
        roomType: linked.roomType || p.roomType || 'entire-place',
        landmarks: p.landmarks || [],
        rooms: (linked.rooms && linked.rooms.length > 0) ? linked.rooms : (p.rooms || []),
        createdAt: p.createdAt
      };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching properties' });
  }
});

// POST create property master with multiple images/videos
// POST /api/master/properties
router.post('/', upload.fields([{ name: 'images', maxCount: 30 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const allProps = await PropertyMaster.find({}, 'propertyNo').lean();
    let maxNo = 100;
    allProps.forEach(p => {
      if (p.propertyNo && p.propertyNo.startsWith('PM-')) {
        const num = parseInt(p.propertyNo.replace('PM-', ''), 10);
        if (!isNaN(num) && num > maxNo) maxNo = num;
      }
    });
    const nextNo = maxNo + 1;
    const data = { ...req.body };

    // Parse stringified fields from FormData
    const parseIfString = (field) => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); } catch (e) { }
      }
    };
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos', 'otherDetails'].forEach(parseIfString);

    if (req.files) {
      if (req.files['images']) {
        const newImages = req.files['images'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
        data.images = Array.isArray(data.images) ? [...data.images, ...newImages] : newImages;
      }
      if (req.files['videos']) {
        const newVideos = req.files['videos'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
        data.videos = Array.isArray(data.videos) ? [...data.videos, ...newVideos] : newVideos;
      }
    }

    data.location = composeLocationString(data) || data.location;
    data.full_address = data.full_address || data.location;

    const newPropertyMaster = await PropertyMaster.create({
      propertyNo: `PM-${nextNo}`,
      ...data
    });

    // Also create the actual Property for guest website visibility
    try {
      // Auto-add property type to master if missing
      if (data.propertyType) {
        const existingType = await PropertyTypeMaster.findOne({ name: new RegExp('^' + data.propertyType + '$', 'i') });
        if (!existingType) {
          await PropertyTypeMaster.create({ name: data.propertyType, status: 'Active' });
        }
      }

      const propData = {
        propertyNo: `PM-${nextNo}`,
        name: data.propertyName || 'Unnamed Property',
        type: data.propertyType || 'Homestay',
        location: data.location || 'Unknown',
        city: data.cityName || data.city || data.location || 'Unknown',
        state: data.stateName || data.state,
        country: data.countryName || data.country || 'India',
        price: Number(data.propertyPrice) || Number(data.price) || 0,
        price_per_night: Number(data.propertyPrice) || Number(data.price_per_night) || 0,
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        ownerContact: data.ownerContact,
        amenities: Array.isArray(data.amenities) ? data.amenities : (Array.isArray(data.amenityTypes) ? data.amenityTypes : []),
        description: data.aboutProperty || data.description,
        images: Array.isArray(data.images) ? data.images.filter(u => u && !u.startsWith('blob:')) : [],
        rooms: Array.isArray(data.rooms) ? data.rooms : [],
        otherDetails: Array.isArray(data.otherDetails) ? data.otherDetails : [],
        checkIn: data.checkIn || '3:00 PM',
        checkOut: data.checkOut || '12:00 PM',
        rules: data.rules,
        bedRooms: Number(data.bedRooms) || 1,
        bathRooms: Number(data.bathRooms) || 1,
        capacity: Number(data.capacity) || 2,
        beds: Number(data.beds) || 1,
        area: data.area,
        status: 'Active',
        full_address: data.full_address || data.location,
        highlights: data.highlights,
        countryId: data.countryId || undefined,
        countryName: data.countryName || data.country,
        stateId: data.stateId || undefined,
        stateName: data.stateName || data.state,
        cityId: data.cityId || undefined,
        cityName: data.cityName || data.city,
        locationId: data.locationId || undefined,
        locationName: data.locationName,
        foodPreference: data.foodPreference || 'none',
        roomType: data.roomType || data.stayConfig || 'entire-place',
        landmarks: Array.isArray(data.landmarks) ? data.landmarks : [],
        experiences: Array.isArray(data.experiences) ? data.experiences : [],
        taxAmount: data.taxAmount ? Number(data.taxAmount) : undefined,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
      };

      // Only set owner if it's a valid non-empty string
      if (data.owner && data.owner.toString().length === 24) {
        propData.owner = data.owner;
      }
      const createdProp = await Property.create({ _id: newPropertyMaster._id, ...propData });

      // Sync rooms to PropertyRequest
      if (Array.isArray(data.rooms) && data.rooms.length > 0) {
        const PropertyRequest = (await import('../../models/PropertyRequest.js')).default;
        
        const normalizedRooms = data.rooms.map(room => {
          const roomType = room.roomType || 'Deluxe';
          return {
            room_type: roomType,
            bed_type: room.bedType || 'Double',
            price_per_room: Number(room.pricePerNight) || 0,
            room_image_url: room.imageUrl || '',
            room_images: room.imageUrl ? [room.imageUrl] : [],
            amenities_types: room.amenities || [],
            offers: room.offer ? [room.offer] : [],
            original_price: room.originalPrice ? Number(room.originalPrice) : undefined,
            tax_amount: room.taxAmount ? Number(room.taxAmount) : undefined,
            checkin_time: room.checkIn || '3:00 PM',
            checkout_time: room.checkOut || '12:00 PM',
            rules: [{ title: 'Property Rules', points: room.rules ? room.rules.split('\\n') : [] }]
          };
        });

        // Auto-add room types to master if missing
        for (const room of normalizedRooms) {
          const existingRoomType = await RoomTypeMaster.findOne({ name: new RegExp('^' + room.room_type + '$', 'i') });
          if (!existingRoomType) {
            await RoomTypeMaster.create({ name: room.room_type, status: 'Active' });
          }
        }

        const firstRoom = normalizedRooms[0];
        const prices = normalizedRooms.map(r => Number(r.price_per_room || 0)).filter(Boolean);
        const reqCount = await PropertyRequest.countDocuments();

        await PropertyRequest.create({
          requestNo: `REQ-${3000 + reqCount + 1}`,
          property: createdProp._id,
          property_id: createdProp._id,
          propertyName: createdProp.name,
          location: createdProp.location,
          category: createdProp.type,
          ownerName: data.ownerName || 'Admin',
          ownerContact: data.ownerContact || 'admin',
          priceByOwner: prices.length > 0 ? Math.min(...prices) : Number(firstRoom.price_per_room),
          rooms: normalizedRooms,
          room_type: firstRoom.room_type,
          bed_type: firstRoom.bed_type,
          price_per_room: firstRoom.price_per_room,
          room_image_url: firstRoom.room_image_url,
          room_images: firstRoom.room_images,
          amenities_types: firstRoom.amenities_types,
          offers: firstRoom.offers,
          checkin_time: firstRoom.checkin_time,
          checkout_time: firstRoom.checkout_time,
          rules: firstRoom.rules,
          admin_status: 'approved',
          status: 'Accepted'
        });
      }
    } catch (err) {
      console.error("Error syncing Property:", err.message);
    }

    res.status(201).json(newPropertyMaster);
  } catch (err) {
    console.error("Error creating PropertyMaster:", err);
    res.status(400).json({ message: "Failed to create property master: " + err.message });
  }
});

// PUT update property master
// PUT /api/master/properties/:id
router.put('/:id', upload.fields([{ name: 'images', maxCount: 30 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    // Parse stringified fields from FormData
    const parseIfString = (field) => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); } catch (e) { }
      }
    };
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos', 'otherDetails'].forEach(parseIfString);

    if (req.files) {
      if (req.files['images']) {
        const newImages = req.files['images'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
        data.images = Array.isArray(data.images) ? [...data.images, ...newImages] : newImages;
      }
      if (req.files['videos']) {
        const newVideos = req.files['videos'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
        data.videos = Array.isArray(data.videos) ? [...data.videos, ...newVideos] : newVideos;
      }
    }

    data.location = composeLocationString(data) || data.location;
    data.full_address = data.full_address || data.location;

    const property = await PropertyMaster.findByIdAndUpdate(req.params.id, data, { new: true });

    // Also update the actual Property
    try {
      if (data.propertyType) {
        const existingType = await PropertyTypeMaster.findOne({ name: new RegExp('^' + data.propertyType + '$', 'i') });
        if (!existingType) {
          await PropertyTypeMaster.create({ name: data.propertyType, status: 'Active' });
        }
      }

      const updateData = {
        name: data.propertyName,
        type: data.propertyType || undefined,
        location: data.location,
        city: data.cityName || data.city || data.location,
        state: data.stateName || data.state,
        country: data.countryName || data.country,
        price: Number(data.propertyPrice) || Number(data.price) || undefined,
        price_per_night: Number(data.propertyPrice) || undefined,
        originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
        ownerContact: data.ownerContact,
        amenities: Array.isArray(data.amenities) ? data.amenities : (Array.isArray(data.amenityTypes) ? data.amenityTypes : undefined),
        description: data.aboutProperty || data.description,
        images: Array.isArray(data.images) ? data.images.filter(u => u && !u.startsWith('blob:')) : undefined,
        rooms: Array.isArray(data.rooms) ? data.rooms : undefined,
        otherDetails: Array.isArray(data.otherDetails) ? data.otherDetails : undefined,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        rules: data.rules,
        bedRooms: Number(data.bedRooms) || undefined,
        bathRooms: Number(data.bathRooms) || undefined,
        capacity: Number(data.capacity) || undefined,
        beds: Number(data.beds) || undefined,
        area: data.area,
        full_address: data.full_address || data.location,
        countryId: data.countryId || undefined,
        countryName: data.countryName || data.country,
        stateId: data.stateId || undefined,
        stateName: data.stateName || data.state,
        cityId: data.cityId || undefined,
        cityName: data.cityName || data.city,
        locationId: data.locationId || undefined,
        locationName: data.locationName,
        foodPreference: data.foodPreference,
        roomType: data.roomType,
        landmarks: Array.isArray(data.landmarks) ? data.landmarks : undefined,
        experiences: Array.isArray(data.experiences) ? data.experiences : undefined,
        taxAmount: data.taxAmount ? Number(data.taxAmount) : undefined,
        latitude: data.latitude ? Number(data.latitude) : undefined,
        longitude: data.longitude ? Number(data.longitude) : undefined,
      };

      if (data.highlights && typeof data.highlights === 'object') {
        updateData.highlights = data.highlights;
      }

      // Remove undefined fields
      Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
      let updatedProp = await Property.findByIdAndUpdate(req.params.id, updateData, { new: true });
      if (!updatedProp && property) {
        const createData = normalizePropertyData(data, {
          propertyNo: property.propertyNo,
          status: 'Active'
        });
        if (data.owner && data.owner.toString().length === 24) {
          createData.owner = data.owner;
        }
        updatedProp = await Property.create({ _id: property._id, ...createData });
      }

      const PropertyRequest = (await import('../../models/PropertyRequest.js')).default;
      await PropertyRequest.updateMany(
        { $or: [{ property: updatedProp._id }, { property_id: updatedProp._id }] },
        {
          $set: {
            propertyName: updatedProp.name,
            location: updatedProp.location,
            category: updatedProp.type,
            ownerName: data.ownerName || 'Admin',
            ownerContact: data.ownerContact || 'admin',
          }
        }
      );

      // Sync new rooms to PropertyRequest if any rooms were sent
      if (Array.isArray(data.rooms) && updatedProp) {
        const normalizedRooms = data.rooms.map(room => {
          const roomType = room.roomType || 'Deluxe';
          return {
            room_type: roomType,
            bed_type: room.bedType || 'Double',
            price_per_room: Number(room.pricePerNight) || 0,
            room_image_url: room.imageUrl || '',
            room_images: room.imageUrl ? [room.imageUrl] : [],
            amenities_types: room.amenities || [],
            offers: room.offer ? [room.offer] : [],
            original_price: room.originalPrice ? Number(room.originalPrice) : undefined,
            tax_amount: room.taxAmount ? Number(room.taxAmount) : undefined,
            checkin_time: room.checkIn || '3:00 PM',
            checkout_time: room.checkOut || '12:00 PM',
            rules: [{ title: 'Property Rules', points: room.rules ? room.rules.split('\\n') : [] }]
          };
        });

        if (normalizedRooms.length === 0) {
          // skip room sync but do NOT return early from the route handler
        } else {

        // Auto-add room types to master if missing
        for (const room of normalizedRooms) {
          const existingRoomType = await RoomTypeMaster.findOne({ name: new RegExp('^' + room.room_type + '$', 'i') });
          if (!existingRoomType) {
            await RoomTypeMaster.create({ name: room.room_type, status: 'Active' });
          }
        }

        const firstRoom = normalizedRooms[0];
        const prices = normalizedRooms.map(r => Number(r.price_per_room || 0)).filter(Boolean);

        const existing = await PropertyRequest.findOne({ 
          $or: [{ property: updatedProp._id }, { property_id: updatedProp._id }] 
        });

        const payload = {
          property: updatedProp._id,
          property_id: updatedProp._id,
          propertyName: updatedProp.name,
          location: updatedProp.location,
          category: updatedProp.type,
          ownerName: data.ownerName || 'Admin',
          ownerContact: data.ownerContact || 'admin',
          priceByOwner: prices.length > 0 ? Math.min(...prices) : Number(firstRoom.price_per_room),
          rooms: normalizedRooms,
          room_type: firstRoom.room_type,
          bed_type: firstRoom.bed_type,
          price_per_room: firstRoom.price_per_room,
          original_price: firstRoom.original_price,
          tax_amount: firstRoom.tax_amount,
          room_image_url: firstRoom.room_image_url,
          room_images: firstRoom.room_images,
          amenities_types: firstRoom.amenities_types,
          offers: firstRoom.offers,
          checkin_time: firstRoom.checkin_time,
          checkout_time: firstRoom.checkout_time,
          rules: firstRoom.rules,
          admin_status: 'approved',
          status: 'Accepted'
        };

        if (existing) {
          Object.assign(existing, payload);
          await existing.save();
        } else {
          const reqCount = await PropertyRequest.countDocuments();
          await PropertyRequest.create({
            requestNo: `REQ-${3000 + reqCount + 1}`,
            ...payload
          });
        }
        } // close else (normalizedRooms.length > 0)
      }
    } catch (err) { console.error('Property sync update error:', err.message); }

    if (!property) return res.status(404).json({ message: 'Property not found' });
    res.json(property);
  } catch (err) {
    console.error("Error updating PropertyMaster:", err);
    res.status(400).json({ message: "Failed to update property" });
  }
});

// DELETE property master
// DELETE /api/master/properties/:id
router.delete('/:id', async (req, res) => {
  try {
    await PropertyMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property master deleted successfully' });
  } catch (err) {
    res.json({ message: 'Property master deleted successfully' });
  }
});

// POST tag property with an experience
// POST /api/admin/properties/:id/experiences
router.post('/:id/experiences', async (req, res) => {
  try {
    const { experienceId } = req.body;
    if (!experienceId) {
      return res.status(400).json({ message: 'Experience ID is required' });
    }

    // Check if tag already exists
    const existing = await PropertyExperienceTag.findOne({
      propertyId: req.params.id,
      experienceId: experienceId
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    const newTag = await PropertyExperienceTag.create({
      propertyId: req.params.id,
      experienceId: experienceId
    });

    res.status(201).json(newTag);
  } catch (err) {
    console.error('Error tagging property:', err);
    res.status(500).json({ message: 'Error tagging property' });
  }
});

export default router;

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
    // --- Type-Specific Details ---
    privatePool: data.privatePool !== undefined ? data.privatePool : defaults.privatePool,
    gardenArea: data.gardenArea !== undefined ? data.gardenArea : defaults.gardenArea,
    chefAvailable: data.chefAvailable !== undefined ? data.chefAvailable : defaults.chefAvailable,
    entirePropertyOnly: data.entirePropertyOnly !== undefined ? data.entirePropertyOnly : defaults.entirePropertyOnly,
    securityCCTV: data.securityCCTV !== undefined ? data.securityCCTV : defaults.securityCCTV,
    numberOfFloors: data.numberOfFloors !== undefined ? data.numberOfFloors : defaults.numberOfFloors,
    plotSize: data.plotSize !== undefined ? data.plotSize : defaults.plotSize,
    restaurantOnSite: data.restaurantOnSite !== undefined ? data.restaurantOnSite : defaults.restaurantOnSite,
    spaWellness: data.spaWellness !== undefined ? data.spaWellness : defaults.spaWellness,
    conferenceRoom: data.conferenceRoom !== undefined ? data.conferenceRoom : defaults.conferenceRoom,
    receptionAllDay: data.receptionAllDay !== undefined ? data.receptionAllDay : defaults.receptionAllDay,
    roomService: data.roomService !== undefined ? data.roomService : defaults.roomService,
    liftElevator: data.liftElevator !== undefined ? data.liftElevator : defaults.liftElevator,
    starRating: data.starRating !== undefined ? data.starRating : defaults.starRating,
    totalRooms: data.totalRooms !== undefined ? data.totalRooms : defaults.totalRooms,
    totalFloors: data.totalFloors !== undefined ? data.totalFloors : defaults.totalFloors,
    activities: Array.isArray(data.activities) ? data.activities : defaults.activities || [],
    floorNumber: data.floorNumber !== undefined ? data.floorNumber : defaults.floorNumber,
    totalFloorsBuilding: data.totalFloorsBuilding !== undefined ? data.totalFloorsBuilding : defaults.totalFloorsBuilding,
    furnishedStatus: data.furnishedStatus !== undefined ? data.furnishedStatus : defaults.furnishedStatus,
    washingMachine: data.washingMachine !== undefined ? data.washingMachine : defaults.washingMachine,
    societyAmenities: Array.isArray(data.societyAmenities) ? data.societyAmenities : defaults.societyAmenities || [],
    bonfireArea: data.bonfireArea !== undefined ? data.bonfireArea : defaults.bonfireArea,
    viewType: data.viewType !== undefined ? data.viewType : defaults.viewType,
    outdoorSeating: data.outdoorSeating !== undefined ? data.outdoorSeating : defaults.outdoorSeating,
    nearestHikingTrail: data.nearestHikingTrail !== undefined ? data.nearestHikingTrail : defaults.nearestHikingTrail,
    distanceFromCity: data.distanceFromCity !== undefined ? data.distanceFromCity : defaults.distanceFromCity,
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
        // --- Type-Specific Details ---
        privatePool: linked.privatePool !== undefined ? linked.privatePool : p.privatePool,
        gardenArea: linked.gardenArea !== undefined ? linked.gardenArea : p.gardenArea,
        chefAvailable: linked.chefAvailable !== undefined ? linked.chefAvailable : p.chefAvailable,
        entirePropertyOnly: linked.entirePropertyOnly !== undefined ? linked.entirePropertyOnly : p.entirePropertyOnly,
        securityCCTV: linked.securityCCTV !== undefined ? linked.securityCCTV : p.securityCCTV,
        numberOfFloors: linked.numberOfFloors !== undefined ? linked.numberOfFloors : p.numberOfFloors,
        plotSize: linked.plotSize !== undefined ? linked.plotSize : p.plotSize,
        restaurantOnSite: linked.restaurantOnSite !== undefined ? linked.restaurantOnSite : p.restaurantOnSite,
        spaWellness: linked.spaWellness !== undefined ? linked.spaWellness : p.spaWellness,
        conferenceRoom: linked.conferenceRoom !== undefined ? linked.conferenceRoom : p.conferenceRoom,
        receptionAllDay: linked.receptionAllDay !== undefined ? linked.receptionAllDay : p.receptionAllDay,
        roomService: linked.roomService !== undefined ? linked.roomService : p.roomService,
        liftElevator: linked.liftElevator !== undefined ? linked.liftElevator : p.liftElevator,
        starRating: linked.starRating !== undefined ? linked.starRating : p.starRating,
        totalRooms: linked.totalRooms !== undefined ? linked.totalRooms : p.totalRooms,
        totalFloors: linked.totalFloors !== undefined ? linked.totalFloors : p.totalFloors,
        activities: linked.activities || p.activities || [],
        floorNumber: linked.floorNumber !== undefined ? linked.floorNumber : p.floorNumber,
        totalFloorsBuilding: linked.totalFloorsBuilding !== undefined ? linked.totalFloorsBuilding : p.totalFloorsBuilding,
        furnishedStatus: linked.furnishedStatus !== undefined ? linked.furnishedStatus : p.furnishedStatus,
        washingMachine: linked.washingMachine !== undefined ? linked.washingMachine : p.washingMachine,
        societyAmenities: linked.societyAmenities || p.societyAmenities || [],
        bonfireArea: linked.bonfireArea !== undefined ? linked.bonfireArea : p.bonfireArea,
        viewType: linked.viewType !== undefined ? linked.viewType : p.viewType,
        outdoorSeating: linked.outdoorSeating !== undefined ? linked.outdoorSeating : p.outdoorSeating,
        nearestHikingTrail: linked.nearestHikingTrail !== undefined ? linked.nearestHikingTrail : p.nearestHikingTrail,
        distanceFromCity: linked.distanceFromCity !== undefined ? linked.distanceFromCity : p.distanceFromCity,
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
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos', 'otherDetails', 'activities', 'societyAmenities'].forEach(parseIfString);

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

    // Map manual location inputs to fields expected by syncPropertyMasters
    if (data.countryName && !data.country) data.country = data.countryName;
    if (data.stateName && !data.state) data.state = data.stateName;
    if (data.cityName && !data.city) data.city = data.cityName;
    if (data.locationName && !data.location) data.location = data.locationName;

    // Sync to Master Collections (Country, State, City, Area)
    try {
      const { syncPropertyMasters } = await import('../../utils/masterSync.js');
      await syncPropertyMasters(data);
    } catch (e) {
      console.error('Error syncing masters from Admin:', e);
    }

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
        // --- Type-Specific Details ---
        privatePool: data.privatePool,
        gardenArea: data.gardenArea,
        chefAvailable: data.chefAvailable,
        entirePropertyOnly: data.entirePropertyOnly,
        securityCCTV: data.securityCCTV,
        numberOfFloors: data.numberOfFloors,
        plotSize: data.plotSize,
        restaurantOnSite: data.restaurantOnSite,
        spaWellness: data.spaWellness,
        conferenceRoom: data.conferenceRoom,
        receptionAllDay: data.receptionAllDay,
        roomService: data.roomService,
        liftElevator: data.liftElevator,
        starRating: data.starRating,
        totalRooms: data.totalRooms,
        totalFloors: data.totalFloors,
        activities: data.activities,
        floorNumber: data.floorNumber,
        totalFloorsBuilding: data.totalFloorsBuilding,
        furnishedStatus: data.furnishedStatus,
        washingMachine: data.washingMachine,
        societyAmenities: data.societyAmenities,
        bonfireArea: data.bonfireArea,
        viewType: data.viewType,
        outdoorSeating: data.outdoorSeating,
        nearestHikingTrail: data.nearestHikingTrail,
        distanceFromCity: data.distanceFromCity,
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

        const firstRoom = normalizedRooms[0] || {};
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
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos', 'otherDetails', 'activities', 'societyAmenities'].forEach(parseIfString);

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

    // Map manual location inputs to fields expected by syncPropertyMasters
    if (data.countryName && !data.country) data.country = data.countryName;
    if (data.stateName && !data.state) data.state = data.stateName;
    if (data.cityName && !data.city) data.city = data.cityName;
    if (data.locationName && !data.location) data.location = data.locationName;

    // Sync to Master Collections (Country, State, City, Area)
    try {
      const { syncPropertyMasters } = await import('../../utils/masterSync.js');
      await syncPropertyMasters(data);
    } catch (e) {
      console.error('Error syncing masters from Admin PUT:', e);
    }

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
        // --- Type-Specific Details ---
        privatePool: data.privatePool !== undefined ? data.privatePool : undefined,
        gardenArea: data.gardenArea !== undefined ? data.gardenArea : undefined,
        chefAvailable: data.chefAvailable !== undefined ? data.chefAvailable : undefined,
        entirePropertyOnly: data.entirePropertyOnly !== undefined ? data.entirePropertyOnly : undefined,
        securityCCTV: data.securityCCTV !== undefined ? data.securityCCTV : undefined,
        numberOfFloors: data.numberOfFloors !== undefined ? data.numberOfFloors : undefined,
        plotSize: data.plotSize !== undefined ? data.plotSize : undefined,
        restaurantOnSite: data.restaurantOnSite !== undefined ? data.restaurantOnSite : undefined,
        spaWellness: data.spaWellness !== undefined ? data.spaWellness : undefined,
        conferenceRoom: data.conferenceRoom !== undefined ? data.conferenceRoom : undefined,
        receptionAllDay: data.receptionAllDay !== undefined ? data.receptionAllDay : undefined,
        roomService: data.roomService !== undefined ? data.roomService : undefined,
        liftElevator: data.liftElevator !== undefined ? data.liftElevator : undefined,
        starRating: data.starRating !== undefined ? data.starRating : undefined,
        totalRooms: data.totalRooms !== undefined ? data.totalRooms : undefined,
        totalFloors: data.totalFloors !== undefined ? data.totalFloors : undefined,
        activities: Array.isArray(data.activities) ? data.activities : undefined,
        floorNumber: data.floorNumber !== undefined ? data.floorNumber : undefined,
        totalFloorsBuilding: data.totalFloorsBuilding !== undefined ? data.totalFloorsBuilding : undefined,
        furnishedStatus: data.furnishedStatus !== undefined ? data.furnishedStatus : undefined,
        washingMachine: data.washingMachine !== undefined ? data.washingMachine : undefined,
        societyAmenities: Array.isArray(data.societyAmenities) ? data.societyAmenities : undefined,
        bonfireArea: data.bonfireArea !== undefined ? data.bonfireArea : undefined,
        viewType: data.viewType !== undefined ? data.viewType : undefined,
        outdoorSeating: data.outdoorSeating !== undefined ? data.outdoorSeating : undefined,
        nearestHikingTrail: data.nearestHikingTrail !== undefined ? data.nearestHikingTrail : undefined,
        distanceFromCity: data.distanceFromCity !== undefined ? data.distanceFromCity : undefined,
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

        const firstRoom = normalizedRooms[0] || {};
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

router.delete('/:id', async (req, res) => {
  try {
    const propertyId = req.params.id;

    // 1. Delete from PropertyMaster
    await PropertyMaster.findByIdAndDelete(propertyId);

    // 2. Delete from Property
    await Property.findByIdAndDelete(propertyId);

    // 3. Delete from PropertyRequest
    try {
      const PropertyRequest = (await import('../../models/PropertyRequest.js')).default;
      await PropertyRequest.deleteMany({ $or: [{ property: propertyId }, { property_id: propertyId }] });
    } catch (e) {
      console.error('Error deleting property requests:', e);
    }

    // 4. Delete from PropertyExperienceTag
    try {
      await PropertyExperienceTag.deleteMany({ propertyId: propertyId });
    } catch (e) {
      console.error('Error deleting property experience tags:', e);
    }

    // 5. Delete from PropertyLandmark
    try {
      const PropertyLandmark = (await import('../../models/PropertyLandmark.js')).default;
      await PropertyLandmark.deleteMany({ property_id: propertyId });
    } catch (e) {
      console.error('Error deleting property landmarks:', e);
    }

    // 6. Delete from PropertyReview
    try {
      const PropertyReview = (await import('../../models/PropertyReview.js')).default;
      await PropertyReview.deleteMany({ property_id: propertyId });
    } catch (e) {
      console.error('Error deleting property reviews:', e);
    }

    res.json({ message: 'Property master and all associated data deleted successfully' });
  } catch (err) {
    console.error('Error deleting property:', err);
    res.status(500).json({ message: 'Failed to delete property from all collections' });
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

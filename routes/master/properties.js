import express from 'express';
import PropertyMaster from '../../models/PropertyMaster.js';
import PropertyExperienceTag from '../../models/PropertyExperienceTag.js';
import Property from '../../models/Property.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// GET all property master entries
// GET /api/master/properties
router.get('/', async (req, res) => {
  try {
    const propertiesDb = await PropertyMaster.find().sort({ createdAt: -1 });

    let results = propertiesDb.map(p => ({
      _id: p._id,
      propertyNo: p.propertyNo,
      propertyType: p.propertyType,
      propertyName: p.propertyName,
      ownerName: p.ownerName,
      ownerContact: p.ownerContact,
      amenityTypes: p.amenityTypes || [],
      location: p.location,
      propertyPrice: p.propertyPrice,
      images: p.images || [],
      videos: p.videos || [],
      aboutProperty: p.aboutProperty,
      status: p.status,
      landmarks: p.landmarks || [],
      createdAt: p.createdAt
    }));

    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching properties' });
  }
});

// POST create property master with multiple images/videos
// POST /api/master/properties
router.post('/', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const count = await PropertyMaster.countDocuments();
    const data = { ...req.body };

    // Parse stringified fields from FormData
    const parseIfString = (field) => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); } catch (e) { }
      }
    };
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos'].forEach(parseIfString);

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

    const newPropertyMaster = await PropertyMaster.create({
      propertyNo: `PM-${100 + count + 1}`,
      ...data
    });

    // Also create the actual Property for guest website visibility
    try {
      const propData = {
        propertyNo: `PM-${100 + count + 1}`,
        name: data.propertyName || 'Unnamed Property',
        type: ['Villa', 'Resort', 'Homestay', 'Cottage', 'Hotel', 'Apartment', 'Motel', 'Bungalow', 'Farmhouse', 'Others'].includes(data.propertyType)
          ? data.propertyType : 'Homestay',
        location: data.location || 'Unknown',
        city: data.cityName || data.city || data.location || 'Unknown',
        state: data.stateName || data.state,
        country: data.countryName || data.country || 'India',
        price: Number(data.propertyPrice) || Number(data.price) || 0,
        price_per_night: Number(data.propertyPrice) || Number(data.price_per_night) || 0,
        ownerContact: data.ownerContact,
        amenities: Array.isArray(data.amenities) ? data.amenities : (Array.isArray(data.amenityTypes) ? data.amenityTypes : []),
        description: data.aboutProperty || data.description,
        images: Array.isArray(data.images) ? data.images.filter(u => u && !u.startsWith('blob:')) : [],
        rooms: Array.isArray(data.rooms) ? data.rooms : [],
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
        stateId: data.stateId || undefined,
        cityId: data.cityId || undefined,
        locationId: data.locationId || undefined,
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
      await Property.create({ _id: newPropertyMaster._id, ...propData });
    } catch (err) {
      console.error("Error syncing Property:", err.message);
    }

    res.status(201).json(newPropertyMaster);
  } catch (err) {
    console.error("Error creating PropertyMaster:", err);
    res.status(400).json({ message: "Failed to create property master" });
  }
});

// PUT update property master
// PUT /api/master/properties/:id
router.put('/:id', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    // Parse stringified fields from FormData
    const parseIfString = (field) => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); } catch (e) { }
      }
    };
    ['amenityTypes', 'amenities', 'experiences', 'rooms', 'landmarks', 'highlights', 'images', 'videos'].forEach(parseIfString);

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

    const property = await PropertyMaster.findByIdAndUpdate(req.params.id, data, { new: true });

    // Also update the actual Property
    try {
      const updateData = {
        name: data.propertyName,
        type: ['Villa', 'Resort', 'Homestay', 'Cottage', 'Hotel', 'Apartment', 'Motel', 'Bungalow', 'Farmhouse', 'Others'].includes(data.propertyType)
          ? data.propertyType : undefined,
        location: data.location,
        city: data.cityName || data.city || data.location,
        state: data.stateName || data.state,
        country: data.countryName || data.country,
        price: Number(data.propertyPrice) || Number(data.price) || undefined,
        price_per_night: Number(data.propertyPrice) || undefined,
        ownerContact: data.ownerContact,
        amenities: Array.isArray(data.amenities) ? data.amenities : (Array.isArray(data.amenityTypes) ? data.amenityTypes : undefined),
        description: data.aboutProperty || data.description,
        images: Array.isArray(data.images) ? data.images.filter(u => u && !u.startsWith('blob:')) : undefined,
        rooms: Array.isArray(data.rooms) ? data.rooms : undefined,
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
        stateId: data.stateId || undefined,
        cityId: data.cityId || undefined,
        locationId: data.locationId || undefined,
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
      await Property.findByIdAndUpdate(req.params.id, updateData);
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
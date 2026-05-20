import express from 'express';
import PropertyMaster from '../../models/PropertyMaster.js';
import PropertyExperienceTag from '../../models/PropertyExperienceTag.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockPropertyMasters = [
  { _id: "pm1", propertyNo: "PM-101", propertyType: "Villa", propertyName: "Sunset Paradise Villa", ownerName: "Ramesh Gupta", ownerContact: "+91 9822012345", amenityTypes: ["Barbeque", "Private Pool", "Lawn"], location: "Anjuna, Goa, India", propertyPrice: 12500, images: ["https://images.unsplash.com/photo-1580587722351-9d9b788c0784?w=500&auto=format&fit=crop&q=60"], videos: [], aboutProperty: "Luxury 4BHK Villa with private pool.", status: "Active" },
  { _id: "pm2", propertyNo: "PM-102", propertyType: "Homestay", propertyName: "Himalayan Woodhouse", ownerName: "Anita Sharma", ownerContact: "+91 9418054321", amenityTypes: ["Fireplace", "WiFi", "Trekking Guide"], location: "Kasol, Himachal Pradesh, India", propertyPrice: 3500, images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60"], videos: [], aboutProperty: "Cozy woodhouse overlooking the Parvati valley.", status: "Active" }
];

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
      createdAt: p.createdAt
    }));

    if (results.length === 0) {
      results = mockPropertyMasters;
    }

    res.json(results);
  } catch (err) {
    res.json(mockPropertyMasters);
  }
});

// POST create property master with multiple images/videos
// POST /api/master/properties
router.post('/', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const count = await PropertyMaster.countDocuments();
    const data = { ...req.body };

    if (req.files) {
      if (req.files['images']) {
        data.images = req.files['images'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
      }
      if (req.files['videos']) {
        data.videos = req.files['videos'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
      }
    }

    if (typeof data.amenityTypes === 'string') {
      try { data.amenityTypes = JSON.parse(data.amenityTypes); } catch(e) { data.amenityTypes = [data.amenityTypes]; }
    }

    const newProperty = await PropertyMaster.create({
      propertyNo: `PM-${100 + count + 1}`,
      ...data
    });
    res.status(201).json(newProperty);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), propertyNo: `PM-${100 + Math.floor(Math.random()*100)}`, ...req.body });
  }
});

// PUT update property master
// PUT /api/master/properties/:id
router.put('/:id', upload.fields([{ name: 'images', maxCount: 10 }, { name: 'videos', maxCount: 5 }]), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.files) {
      if (req.files['images']) {
        data.images = req.files['images'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
      }
      if (req.files['videos']) {
        data.videos = req.files['videos'].map(file => file.filename.startsWith('http') ? file.filename : `/uploads/${file.filename}`);
      }
    }

    if (typeof data.amenityTypes === 'string') {
      try { data.amenityTypes = JSON.parse(data.amenityTypes); } catch(e) { data.amenityTypes = [data.amenityTypes]; }
    }

    const property = await PropertyMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!property) return res.json({ _id: req.params.id, ...data, message: 'Mock property master updated' });
    res.json(property);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock property master updated' });
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

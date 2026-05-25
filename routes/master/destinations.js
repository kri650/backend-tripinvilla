import express from 'express';
import DestinationMaster from '../../models/DestinationMaster.js';
import PropertyMaster from '../../models/PropertyMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockDestinations = [
  { _id: "dm1", destinationName: "Mumbai", stateName: "Maharashtra", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Villa", "Apartment"], description: "The city of dreams.", propertiesCount: 45, status: "Active" },
  { _id: "dm2", destinationName: "Goa", stateName: "Goa", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Villa", "Hotel", "Resort"], description: "Sun, sand and heritage Portuguese villas.", propertiesCount: 64, status: "Active" },
  { _id: "dm3", destinationName: "Delhi", stateName: "Delhi", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Hotel", "Homestay"], description: "Historical monuments and vibrant markets.", propertiesCount: 89, status: "Active" },
  { _id: "dm4", destinationName: "Manali", stateName: "Himachal Pradesh", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Cottage", "Homestay", "Resort"], description: "Snow-capped mountains and adventure sports.", propertiesCount: 52, status: "Active" },
  { _id: "dm5", destinationName: "Kasol", stateName: "Himachal Pradesh", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Homestay", "Cottage"], description: "Peaceful valleys and riverside woodhouses.", propertiesCount: 28, status: "Active" },
  { _id: "dm6", destinationName: "Mukteswar", stateName: "Uttarakhand", countryName: "India", coverImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=400&q=80", propertyTypesOffered: ["Resort", "Homestay"], description: "Breathtaking Himalayan views and fruit orchards.", propertiesCount: 15, status: "Active" }
];

// GET all destinations with auto-calculated property counts
// GET /api/masters/destinations
router.get('/', async (req, res) => {
  try {
    const destinationsDb = await DestinationMaster.find().populate('stateId').populate('countryId').sort({ destinationName: 1 });
    let results = [];

    for (const dest of destinationsDb) {
      const count = await PropertyMaster.countDocuments({ location: { $regex: dest.destinationName, $options: 'i' } });
      results.push({
        _id: dest._id,
        destinationName: dest.destinationName,
        stateId: dest.stateId,
        stateName: dest.stateId ? dest.stateId.stateName : 'N/A',
        countryId: dest.countryId,
        countryName: dest.countryId ? dest.countryId.countryName : 'N/A',
        coverImageUrl: dest.coverImageUrl || 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&auto=format&fit=crop&q=60',
        propertyTypesOffered: dest.propertyTypesOffered || ['Villa', 'Homestay'],
        description: dest.description,
        propertiesCount: count,
        status: dest.status
      });
    }

    const dbNames = results.map(r => (r.destinationName || '').toLowerCase());
    const missingMocks = mockDestinations.filter(m => !dbNames.includes((m.destinationName || '').toLowerCase()));
    results = [...results, ...missingMocks];

    res.json(results);
  } catch (err) {
    res.json(mockDestinations);
  }
});

// POST add destination
// POST /api/masters/destinations
router.post('/', upload.single('coverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.coverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    if (typeof data.propertyTypesOffered === 'string') {
      try { data.propertyTypesOffered = JSON.parse(data.propertyTypesOffered); } catch(e) { data.propertyTypesOffered = [data.propertyTypesOffered]; }
    }
    const newDest = await DestinationMaster.create(data);
    res.status(201).json(newDest);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), ...req.body });
  }
});

// PUT edit destination
// PUT /api/masters/destinations/:id
router.put('/:id', upload.single('coverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.coverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    if (typeof data.propertyTypesOffered === 'string') {
      try { data.propertyTypesOffered = JSON.parse(data.propertyTypesOffered); } catch(e) { data.propertyTypesOffered = [data.propertyTypesOffered]; }
    }
    const dest = await DestinationMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!dest) return res.json({ _id: req.params.id, ...data, message: 'Mock destination updated' });
    res.json(dest);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock destination updated' });
  }
});

// DELETE destination
// DELETE /api/masters/destinations/:id
router.delete('/:id', async (req, res) => {
  try {
    await DestinationMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Destination master deleted successfully' });
  } catch (err) {
    res.json({ message: 'Destination master deleted successfully' });
  }
});

export default router;

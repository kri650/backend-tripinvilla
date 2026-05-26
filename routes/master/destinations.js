import express from 'express';
import DestinationMaster from '../../models/DestinationMaster.js';
import PropertyMaster from '../../models/PropertyMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// GET all destinations with auto-calculated property counts
// GET /api/masters/destinations
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) {
      filter.status = req.query.status;
    }
    const destinationsDb = await DestinationMaster.find(filter).populate('stateId').populate('countryId').sort({ destinationName: 1 });
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

    res.json(results);
  } catch (err) {
    console.error('Error fetching destinations:', err);
    res.status(500).json({ message: 'Error fetching destinations' });
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
    console.error('Error creating destination:', err);
    res.status(400).json({ message: err.message });
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
    if (!dest) return res.status(404).json({ message: 'Destination not found' });
    res.json(dest);
  } catch (err) {
    console.error('Error updating destination:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE destination
// DELETE /api/masters/destinations/:id
router.delete('/:id', async (req, res) => {
  try {
    await DestinationMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Destination master deleted successfully' });
  } catch (err) {
    console.error('Error deleting destination:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

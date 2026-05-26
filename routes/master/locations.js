import express from 'express';
import LocationMaster from '../../models/LocationMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// Helper to map DB location to response shape
const mapLoc = (l) => ({
  _id: l._id,
  locationName: l.locationName,
  locationType: l.locationType,
  parentLocationHierarchy: l.parentLocation || '',
  landmarks: (l.landmarks || []).map(lm => ({
    _id: lm._id,
    landmarkName: lm.name,
    landmarkPopularity: lm.popularity || 'Tourist Popular',
    landmarkImageUrl: (lm.images && lm.images[0]) || ''
  })),
  status: l.status,
  aboutLocation: l.aboutLocation
});

// GET all location masters
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.city_id) filter.parentLocation = req.query.city_id;
    const locationsDb = await LocationMaster.find(filter).sort({ createdAt: -1 });
    res.json(locationsDb.map(mapLoc));
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ message: 'Error fetching locations' });
  }
});

// GET active locations for dropdowns
router.get('/active', async (req, res) => {
  try {
    const filter = { status: 'Active' };
    if (req.query.city_id) filter.parentLocation = req.query.city_id;
    const locationsDb = await LocationMaster.find(filter).sort({ locationName: 1 });
    res.json(locationsDb.map(mapLoc));
  } catch (err) {
    console.error('Error fetching active locations:', err);
    res.status(500).json({ message: 'Error fetching active locations' });
  }
});

// POST add location master (supports landmarks with uploaded images)
router.post('/', upload.array('landmarkImages', 20), async (req, res) => {
  try {
    const data = { ...req.body };
    data.parentLocation = data.parentLocationHierarchy || data.parentLocation;

    let parsedLandmarks = [];
    if (data.landmarks) {
      const landmarkArray = typeof data.landmarks === 'string' ? JSON.parse(data.landmarks) : data.landmarks;
      const files = req.files || [];
      parsedLandmarks = landmarkArray.map((l, idx) => ({
        name: l.landmarkName || l.name,
        popularity: l.landmarkPopularity || l.popularity || 'Tourist Popular',
        images: files[idx] ? [`/uploads/${files[idx].filename}`] : (l.landmarkImageUrl ? [l.landmarkImageUrl] : (l.images || []))
      }));
    }
    data.landmarks = parsedLandmarks;

    const newLocation = await LocationMaster.create(data);
    res.status(201).json(mapLoc(newLocation));
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT edit location master
router.put('/:id', upload.array('landmarkImages', 20), async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.parentLocationHierarchy) data.parentLocation = data.parentLocationHierarchy;

    if (data.landmarks) {
      const landmarkArray = typeof data.landmarks === 'string' ? JSON.parse(data.landmarks) : data.landmarks;
      const files = req.files || [];
      data.landmarks = landmarkArray.map((l, idx) => ({
        _id: l._id,
        name: l.landmarkName || l.name,
        popularity: l.landmarkPopularity || l.popularity || 'Tourist Popular',
        images: files[idx] ? [`/uploads/${files[idx].filename}`] : (l.landmarkImageUrl ? [l.landmarkImageUrl] : (l.images || []))
      }));
    }

    const location = await LocationMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json(mapLoc(location));
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE location master
router.delete('/:id', async (req, res) => {
  try {
    await LocationMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location master deleted successfully' });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ message: 'Error deleting location' });
  }
});

// POST add landmark to existing location
router.post('/:id/landmarks', upload.single('landmarkImage'), async (req, res) => {
  try {
    const loc = await LocationMaster.findById(req.params.id);
    if (!loc) return res.status(404).json({ message: 'Location not found' });

    const imgUrl = req.file ? `/uploads/${req.file.filename}` : (req.body.landmarkImageUrl || '');
    const newLandmark = {
      name: req.body.landmarkName || req.body.name,
      popularity: req.body.landmarkPopularity || req.body.popularity || 'Tourist Popular',
      images: imgUrl ? [imgUrl] : []
    };

    loc.landmarks.push(newLandmark);
    await loc.save();
    
    const added = loc.landmarks[loc.landmarks.length - 1];
    res.status(201).json({
      _id: added._id,
      landmarkName: added.name,
      landmarkPopularity: added.popularity,
      landmarkImageUrl: added.images[0] || ''
    });
  } catch (err) {
    console.error('Error adding landmark:', err);
    res.status(500).json({ message: 'Error adding landmark' });
  }
});

export default router;

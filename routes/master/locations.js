import express from 'express';
import LocationMaster from '../../models/LocationMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockLocations = [
  {
    _id: "lm1",
    locationName: "Goa, India",
    locationType: "State",
    parentLocationHierarchy: "India",
    landmarks: [{
      _id: "ldmk1",
      name: "Anjuna Flea Market",
      popularity: "Tourist Popular",
      images: ["https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=500&auto=format&fit=crop&q=60"]
    }],
    status: "Active",
    aboutLocation: "Coastal paradise renowned for its pristine beaches, vibrant nightlife, and Portuguese heritage architecture."
  }
];

// GET all location masters
router.get('/', async (req, res) => {
  try {
    const locationsDb = await LocationMaster.find().sort({ createdAt: -1 });
    let results = locationsDb.map(l => ({
      _id: l._id,
      locationName: l.locationName,
      locationType: l.locationType,
      parentLocationHierarchy: l.parentLocation,
      landmarks: l.landmarks,
      status: l.status,
      aboutLocation: l.aboutLocation
    }));

    const dbNames = results.map(r => (r.locationName || '').toLowerCase());
    const missingMocks = mockLocations.filter(m => !dbNames.includes((m.locationName || '').toLowerCase()));
    results = [...results, ...missingMocks];
    res.json(results);
  } catch (err) {
    res.json(mockLocations);
  }
});

// GET active locations for frontend carousel
router.get('/active', async (req, res) => {
  try {
    const locationsDb = await LocationMaster.find({ status: 'Active' }).sort({ createdAt: -1 });
    let results = locationsDb.map(l => ({
      _id: l._id,
      locationName: l.locationName,
      locationType: l.locationType,
      parentLocationHierarchy: l.parentLocation,
      landmarks: l.landmarks,
      status: l.status,
      aboutLocation: l.aboutLocation
    }));

    const dbNames = results.map(r => (r.locationName || '').toLowerCase());
    const missingMocks = mockLocations.filter(m => m.status === 'Active' && !dbNames.includes((m.locationName || '').toLowerCase()));
    results = [...results, ...missingMocks];
    res.json(results);
  } catch (err) {
    res.json(mockLocations.filter(l => l.status === 'Active'));
  }
});

// POST add location master
router.post('/', async (req, res) => {
  try {
    const data = { ...req.body };
    data.parentLocation = data.parentLocationHierarchy;

    let parsedLandmarks = [];
    if (data.landmarks && Array.isArray(data.landmarks)) {
      parsedLandmarks = data.landmarks.map(l => ({
        name: l.landmarkName || l.name,
        popularity: l.landmarkPopularity || l.popularity || 'Tourist Popular',
        images: l.landmarkImageUrl ? [l.landmarkImageUrl] : (l.images || [])
      }));
    }
    data.landmarks = parsedLandmarks;

    const newLocation = await LocationMaster.create(data);
    res.status(201).json(newLocation);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error creating location' });
  }
});

// PUT edit location master
router.put('/:id', async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.parentLocationHierarchy) data.parentLocation = data.parentLocationHierarchy;

    if (data.landmarks && Array.isArray(data.landmarks)) {
      data.landmarks = data.landmarks.map(l => ({
        _id: l._id,
        name: l.landmarkName || l.name,
        popularity: l.landmarkPopularity || l.popularity || 'Tourist Popular',
        images: l.landmarkImageUrl ? [l.landmarkImageUrl] : (l.images || [])
      }));
    }

    const location = await LocationMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!location) return res.status(404).json({ message: 'Location not found' });
    res.json(location);
  } catch (err) {
    res.status(500).json({ message: 'Error updating location' });
  }
});

// DELETE location master
router.delete('/:id', async (req, res) => {
  try {
    await LocationMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Location master deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting location' });
  }
});

// POST add landmark to location
router.post('/:id/landmarks', async (req, res) => {
  try {
    const loc = await LocationMaster.findById(req.params.id);
    if (!loc) return res.status(404).json({ message: 'Location not found' });

    const newLandmark = {
      name: req.body.landmarkName || req.body.name,
      popularity: req.body.landmarkPopularity || req.body.popularity || 'Tourist Popular',
      images: req.body.landmarkImageUrl ? [req.body.landmarkImageUrl] : (req.body.image_url ? [req.body.image_url] : [])
    };

    loc.landmarks.push(newLandmark);
    await loc.save();
    
    // Return the newly added landmark with its generated _id
    const added = loc.landmarks[loc.landmarks.length - 1];
    res.status(201).json(added);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error adding landmark' });
  }
});

export default router;

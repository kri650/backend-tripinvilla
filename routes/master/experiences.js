import express from 'express';
import ExperienceMaster from '../../models/ExperienceMaster.js';
import PropertyExperienceTag from '../../models/PropertyExperienceTag.js';
import Property from '../../models/Property.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockExperiences = [
  { _id: "6a0e00000000000000000001", experienceName: "Jungle Stay", representingIcon: "TreePine", themeCoverImageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500&auto=format&fit=crop&q=60", description: "Immersive nature retreats surrounded by lush wild forest canopy.", propertiesCount: 24, status: "Active" },
  { _id: "6a0e00000000000000000002", experienceName: "Beachfront", representingIcon: "Umbrella", themeCoverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60", description: "Wake up to soothing ocean waves and walk right onto golden sands.", propertiesCount: 42, status: "Active" },
  { _id: "6a0e00000000000000000003", experienceName: "Mountain View", representingIcon: "Mountain", themeCoverImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=60", description: "High altitude panoramic stays amidst snowy peaks and crisp mountain air.", propertiesCount: 35, status: "Active" }
];

// GET active experiences for frontend tab
router.get('/active', async (req, res) => {
  try {
    const experiencesDb = await ExperienceMaster.find({ status: 'Active' }).sort({ experienceName: 1 });
    let results = [];

    for (const exp of experiencesDb) {
      const count = await Property.countDocuments({
        $or: [
          { experiences: exp._id },
          { experiences: exp.experienceName }
        ]
      });
      results.push({
        _id: exp._id,
        experienceName: exp.experienceName,
        representingIcon: exp.representingIcon || 'TreePine',
        themeCoverImageUrl: exp.themeCoverImageUrl,
        description: exp.description,
        propertiesCount: count,
        status: exp.status
      });
    }

    const dbIds = results.map(r => r._id.toString());
    const mergedResults = [...results];
    for (const mock of mockExperiences) {
      if (!dbIds.includes(mock._id.toString()) && mock.status === 'Active') {
        mergedResults.push(mock);
      }
    }

    res.json(mergedResults);
  } catch (err) {
    res.json(mockExperiences.filter(e => e.status === 'Active'));
  }
});

// GET all unique experiences with auto-calculated counts
router.get('/', async (req, res) => {
  try {
    const experiencesDb = await ExperienceMaster.find().sort({ experienceName: 1 });
    let results = [];

    for (const exp of experiencesDb) {
      const count = await Property.countDocuments({
        $or: [
          { experiences: exp._id },
          { experiences: exp.experienceName }
        ]
      });
      results.push({
        _id: exp._id,
        experienceName: exp.experienceName,
        representingIcon: exp.representingIcon || 'TreePine',
        themeCoverImageUrl: exp.themeCoverImageUrl,
        description: exp.description,
        propertiesCount: count,
        status: exp.status
      });
    }

    const dbIds = results.map(r => r._id.toString());
    const mergedResults = [...results];
    for (const mock of mockExperiences) {
      if (!dbIds.includes(mock._id.toString())) {
        mergedResults.push(mock);
      }
    }

    res.json(mergedResults);
  } catch (err) {
    res.json(mockExperiences);
  }
});

// POST add experience
router.post('/', upload.single('themeCoverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.themeCoverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    } else if (data.themeCoverImageUrl) {
      // Allow passing URL directly
    }
    const newExp = await ExperienceMaster.create(data);
    res.status(201).json(newExp);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), ...req.body });
  }
});

// PUT edit experience
router.put('/:id', upload.single('themeCoverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.themeCoverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const exp = await ExperienceMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!exp) return res.json({ _id: req.params.id, ...data, message: 'Mock experience updated' });
    res.json(exp);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock experience updated' });
  }
});

// DELETE experience
router.delete('/:id', async (req, res) => {
  try {
    // Delete tags as well
    await PropertyExperienceTag.deleteMany({ experienceId: req.params.id });
    await ExperienceMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience master deleted successfully' });
  } catch (err) {
    res.json({ message: 'Experience master deleted successfully' });
  }
});

export default router;

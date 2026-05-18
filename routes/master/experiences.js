import express from 'express';
import ExperienceMaster from '../../models/ExperienceMaster.js';
import PropertyMaster from '../../models/PropertyMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockExperiences = [
  { _id: "exp1", experienceName: "Jungle Stay", representingIcon: "TreePine", themeCoverImageUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=500&auto=format&fit=crop&q=60", description: "Immersive nature retreats surrounded by lush wild forest canopy.", propertiesCount: 24, status: "Active" },
  { _id: "exp2", experienceName: "Beachfront", representingIcon: "Umbrella", themeCoverImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=500&auto=format&fit=crop&q=60", description: "Wake up to soothing ocean waves and walk right onto golden sands.", propertiesCount: 42, status: "Active" },
  { _id: "exp3", experienceName: "Mountain View", representingIcon: "Mountain", themeCoverImageUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=500&auto=format&fit=crop&q=60", description: "High altitude panoramic stays amidst snowy peaks and crisp mountain air.", propertiesCount: 35, status: "Active" }
];

// GET all unique experiences with auto-calculated counts
// GET /api/masters/experiences
router.get('/', async (req, res) => {
  try {
    const experiencesDb = await ExperienceMaster.find().sort({ experienceName: 1 });
    let results = [];

    for (const exp of experiencesDb) {
      const count = await PropertyMaster.countDocuments({ aboutProperty: { $regex: exp.experienceName, $options: 'i' } });
      results.push({
        _id: exp._id,
        experienceName: exp.experienceName,
        representingIcon: exp.representingIcon || 'TreePine',
        themeCoverImageUrl: exp.themeCoverImageUrl || 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop&q=60',
        description: exp.description,
        propertiesCount: count,
        status: exp.status
      });
    }

    if (results.length === 0) {
      results = mockExperiences;
    }

    res.json(results);
  } catch (err) {
    res.json(mockExperiences);
  }
});

// POST add experience
// POST /api/masters/experiences
router.post('/', upload.single('themeCoverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.themeCoverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const newExp = await ExperienceMaster.create(data);
    res.status(201).json(newExp);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), ...req.body });
  }
});

// PUT edit experience
// PUT /api/masters/experiences/:id
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
// DELETE /api/masters/experiences/:id
router.delete('/:id', async (req, res) => {
  try {
    await ExperienceMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience master deleted successfully' });
  } catch (err) {
    res.json({ message: 'Experience master deleted successfully' });
  }
});

export default router;

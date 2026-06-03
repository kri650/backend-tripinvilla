import express from 'express';
import mongoose from 'mongoose';
import ExperienceMaster from '../../models/ExperienceMaster.js';
import PropertyExperienceTag from '../../models/PropertyExperienceTag.js';
import Property from '../../models/Property.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// GET active experiences for frontend tab
router.get('/active', async (req, res) => {
  try {
    const experiencesDb = await ExperienceMaster.find({ status: 'Active' }).sort({ experienceName: 1 });
    let results = [];

    for (const exp of experiencesDb) {
      const query = { experiences: exp._id };
      const count = await Property.countDocuments(query);
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

    res.json(results);
  } catch (err) {
    console.error('Error fetching active experiences:', err);
    res.status(500).json({ message: 'Error fetching experiences' });
  }
});

// GET all unique experiences with auto-calculated counts
router.get('/', async (req, res) => {
  try {
    const experiencesDb = await ExperienceMaster.find().sort({ experienceName: 1 });
    let results = [];

    for (const exp of experiencesDb) {
      const query = { experiences: exp._id };
      const count = await Property.countDocuments(query);
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

    res.json(results);
  } catch (err) {
    console.error('Error fetching experiences:', err);
    res.status(500).json({ message: 'Error fetching experiences' });
  }
});

// POST add experience
router.post('/', upload.single('themeCoverImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.themeCoverImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const newExp = await ExperienceMaster.create(data);
    res.status(201).json(newExp);
  } catch (err) {
    console.error('Error creating experience:', err);
    res.status(400).json({ message: err.message });
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
    if (!exp) return res.status(404).json({ message: 'Experience not found' });
    res.json(exp);
  } catch (err) {
    console.error('Error updating experience:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE experience
router.delete('/:id', async (req, res) => {
  try {
    await PropertyExperienceTag.deleteMany({ experienceId: req.params.id });
    await ExperienceMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Experience master deleted successfully' });
  } catch (err) {
    console.error('Error deleting experience:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

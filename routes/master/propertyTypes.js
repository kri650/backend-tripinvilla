import express from 'express';
import PropertyTypeMaster from '../../models/PropertyTypeMaster.js';
import Property from '../../models/Property.js';
import { cleanupPropertyTypeDuplicates } from '../../utils/masterSync.js';

const router = express.Router();

const toTitleCase = (str) => {
  if (!str) return str;
  return str.trim().charAt(0).toUpperCase() + str.trim().slice(1).toLowerCase();
};

// GET all active property types (deduplicated)
router.get('/', async (req, res) => {
  try {
    const typesDb = await PropertyTypeMaster.find().sort({ name: 1 });

    // Deduplicate case-insensitively, prefer capitalized
    const typesMap = new Map();
    for (const type of typesDb) {
      if (!type.name) continue;
      const lowerName = type.name.toLowerCase();
      if (!typesMap.has(lowerName)) {
        typesMap.set(lowerName, type);
      } else {
        const existing = typesMap.get(lowerName);
        if (
          type.name[0] === type.name[0].toUpperCase() &&
          existing.name[0] !== existing.name[0].toUpperCase()
        ) {
          typesMap.set(lowerName, type);
        }
      }
    }

    const types = [];
    for (const type of Array.from(typesMap.values())) {
      const escapedName = (type.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = await Property.countDocuments({
        type: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      });
      types.push({
        _id: type._id,
        name: type.name,
        status: type.status,
        propertiesCount: count,
        createdAt: type.createdAt,
        updatedAt: type.updatedAt,
      });
    }

    types.sort((a, b) => a.name.localeCompare(b.name));
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch property types' });
  }
});

// POST /cleanup — merge DB duplicates and fix casing on all properties
router.post('/cleanup', async (req, res) => {
  try {
    await cleanupPropertyTypeDuplicates();
    res.json({ message: 'Cleanup complete. Duplicate property types merged and casing fixed.' });
  } catch (err) {
    res.status(500).json({ error: 'Cleanup failed', detail: err.message });
  }
});

// POST add a new property type
router.post('/', async (req, res) => {
  try {
    const name = toTitleCase(req.body.name);
    const { status } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const existing = await PropertyTypeMaster.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ error: 'Property type already exists' });
    }
    const newType = new PropertyTypeMaster({ name, status: status || 'Active' });
    await newType.save();
    res.json({ message: 'Property type created successfully', type: newType });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create property type' });
  }
});

// PUT update property type
router.put('/:id', async (req, res) => {
  try {
    const name = req.body.name ? toTitleCase(req.body.name) : undefined;
    const { status } = req.body;
    const type = await PropertyTypeMaster.findById(req.params.id);
    if (!type) return res.status(404).json({ error: 'Not found' });

    if (name) {
      const existing = await PropertyTypeMaster.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: type._id },
      });
      if (existing) return res.status(400).json({ error: 'Property type already exists' });
      type.name = name;
    }
    if (status) type.status = status;

    await type.save();
    res.json({ message: 'Property type updated successfully', type });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update property type' });
  }
});

// DELETE property type
router.delete('/:id', async (req, res) => {
  try {
    await PropertyTypeMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property type deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete property type' });
  }
});

export default router;

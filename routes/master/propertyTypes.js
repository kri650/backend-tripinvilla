import express from 'express';
import PropertyTypeMaster from '../../models/PropertyTypeMaster.js';
import Property from '../../models/Property.js';

const router = express.Router();

// GET all active property types
router.get('/', async (req, res) => {
  try {
    const typesDb = await PropertyTypeMaster.find().sort({ name: 1 });
    let types = [];
    for (const type of typesDb) {
      const escapedName = (type.name || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const count = await Property.countDocuments({ type: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      types.push({
        _id: type._id,
        name: type.name,
        status: type.status,
        propertiesCount: count,
        createdAt: type.createdAt,
        updatedAt: type.updatedAt
      });
    }
    res.json(types);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch property types' });
  }
});

// POST add a new property type
router.post('/', async (req, res) => {
  try {
    const { name, status } = req.body;
    const existing = await PropertyTypeMaster.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
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
    const { name, status } = req.body;
    const type = await PropertyTypeMaster.findById(req.params.id);
    if (!type) return res.status(404).json({ error: 'Not found' });

    if (name) {
      const existing = await PropertyTypeMaster.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') }, _id: { $ne: type._id } });
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

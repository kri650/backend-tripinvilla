import express from 'express';
import RoomTypeMaster from '../../models/RoomTypeMaster.js';

const router = express.Router();

// Get all room types
router.get('/', async (req, res) => {
  try {
    const types = await RoomTypeMaster.find().sort({ createdAt: -1 });
    res.json(types);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new room type
router.post('/', async (req, res) => {
  try {
    const { name, status } = req.body;
    const existing = await RoomTypeMaster.findOne({ name: new RegExp('^' + name + '$', 'i') });
    if (existing) {
      return res.status(400).json({ error: 'Room type already exists' });
    }
    const newType = new RoomTypeMaster({ name, status });
    await newType.save();
    res.status(201).json(newType);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update room type
router.put('/:id', async (req, res) => {
  try {
    const { name, status } = req.body;
    const updated = await RoomTypeMaster.findByIdAndUpdate(
      req.params.id,
      { name, status },
      { new: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete room type
router.delete('/:id', async (req, res) => {
  try {
    await RoomTypeMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

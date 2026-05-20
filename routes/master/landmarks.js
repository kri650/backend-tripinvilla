import express from 'express';
import LocationMaster from '../../models/LocationMaster.js';

const router = express.Router();

// DELETE remove landmark
router.delete('/:id', async (req, res) => {
  try {
    const loc = await LocationMaster.findOneAndUpdate(
      { "landmarks._id": req.params.id },
      { $pull: { landmarks: { _id: req.params.id } } },
      { new: true }
    );
    if (!loc) return res.status(404).json({ message: 'Landmark not found' });
    res.json({ message: 'Landmark deleted successfully' });
  } catch (err) {
    console.error('Error deleting landmark:', err);
    res.status(500).json({ message: 'Error deleting landmark' });
  }
});

export default router;

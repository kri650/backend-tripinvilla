import express from 'express';
import StateMaster from '../../models/StateMaster.js';
import CityMaster from '../../models/CityMaster.js';
import User from '../../models/User.js';

const router = express.Router();

// GET all states with virtual counts
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.country_id) {
      filter.countryId = req.query.country_id;
    }

    const statesDb = await StateMaster.find(filter).populate('countryId').sort({ stateName: 1 });
    let results = [];

    for (const st of statesDb) {
      const citiesCount = await CityMaster.countDocuments({ stateId: st._id });
      // Owners count from users where role = 'owner' and state = st._id
      const ownersCount = await User.countDocuments({ role: 'owner', state: st._id.toString() });

      results.push({
        _id: st._id,
        stateName: st.stateName,
        countryId: st.countryId,
        countryName: st.countryId ? st.countryId.countryName : 'N/A',
        status: st.status,
        citiesCount: citiesCount,
        ownersCount: ownersCount
      });
    }

    res.json(results);
  } catch (err) {
    console.error('Error fetching states:', err);
    res.status(500).json({ message: 'Error fetching states' });
  }
});

// GET active states for dropdowns
router.get('/active', async (req, res) => {
  try {
    const filter = { status: 'Active' };
    if (req.query.country_id) {
      filter.countryId = req.query.country_id;
    }
    const statesDb = await StateMaster.find(filter).populate('countryId').sort({ stateName: 1 });
    let results = statesDb.map(st => ({
      _id: st._id,
      stateName: st.stateName,
      countryId: st.countryId,
      countryName: st.countryId ? st.countryId.countryName : 'N/A',
      status: st.status
    }));

    res.json(results);
  } catch (err) {
    console.error('Error fetching active states:', err);
    res.status(500).json({ message: 'Error fetching active states' });
  }
});

// POST add state
router.post('/', async (req, res) => {
  try {
    const newState = await StateMaster.create(req.body);
    res.status(201).json(newState);
  } catch (err) {
    console.error('Error creating state:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT edit state
router.put('/:id', async (req, res) => {
  try {
    const state = await StateMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!state) return res.status(404).json({ message: 'State not found' });
    res.json(state);
  } catch (err) {
    console.error('Error updating state:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE state
router.delete('/:id', async (req, res) => {
  try {
    const citiesCount = await CityMaster.countDocuments({ stateId: req.params.id });
    if (citiesCount > 0) {
      return res.status(400).json({ message: 'Cannot delete state because it has associated cities.' });
    }

    await StateMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'State master deleted successfully' });
  } catch (err) {
    console.error('Error deleting state:', err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

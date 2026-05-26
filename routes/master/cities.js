import express from 'express';
import CityMaster from '../../models/CityMaster.js';
import Property from '../../models/Property.js';

const router = express.Router();

const mockCityMasters = [
  { _id: "cm1", cityName: "Mumbai", stateName: "Maharashtra", countryName: "India", status: "Active", propertiesCount: 145 },
  { _id: "cm2", cityName: "Kasol", stateName: "Himachal Pradesh", countryName: "India", status: "Active", propertiesCount: 38 },
  { _id: "cm3", cityName: "Panaji", stateName: "Goa", countryName: "India", status: "Active", propertiesCount: 64 },
  { _id: "cm4", cityName: "Bangalore", stateName: "Karnataka", countryName: "India", status: "Active", propertiesCount: 112 }
];

// GET search autocomplete
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json([]);
    const cities = await CityMaster.find({ 
      cityName: { $regex: q, $options: 'i' },
      status: 'Active'
    }).limit(10).populate('stateId').populate('countryId');
    res.json(cities);
  } catch (err) {
    res.json([]);
  }
});

// GET active cities for dropdowns
router.get('/active', async (req, res) => {
  try {
    const filter = { status: 'Active' };
    if (req.query.state_id && req.query.state_id !== 'All') {
      filter.stateId = req.query.state_id;
    }
    const citiesDb = await CityMaster.find(filter).populate('stateId').populate('countryId').sort({ cityName: 1 });
    let results = citiesDb.map(c => ({
      _id: c._id,
      cityName: c.cityName,
      stateId: c.stateId,
      stateName: c.stateId ? c.stateId.stateName : 'N/A',
      countryId: c.countryId,
      countryName: c.countryId ? c.countryId.countryName : 'N/A',
      status: c.status
    }));

    if (!req.query.state_id || req.query.state_id === 'All') {
      const dbNames = results.map(r => (r.cityName || '').toLowerCase());
      const missingMocks = mockCityMasters.filter(m => m.status === 'Active' && !dbNames.includes((m.cityName || '').toLowerCase()));
      results = [...results, ...missingMocks];
    }
    res.json(results);
  } catch (err) {
    res.json(mockCityMasters.filter(c => c.status === 'Active'));
  }
});

// GET all cities with virtual property counts
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.state_id && req.query.state_id !== 'All') {
      filter.stateId = req.query.state_id;
    }

    const citiesDb = await CityMaster.find(filter).populate('stateId').populate('countryId').sort({ cityName: 1 });
    let results = [];

    for (const c of citiesDb) {
      // Properties count WHERE city = selected city name
      const propCount = await Property.countDocuments({ city: { $regex: new RegExp(`^${c.cityName}$`, 'i') } });
      results.push({
        _id: c._id,
        cityName: c.cityName,
        stateId: c.stateId,
        stateName: c.stateId ? c.stateId.stateName : 'N/A',
        countryId: c.countryId,
        countryName: c.countryId ? c.countryId.countryName : 'N/A',
        status: c.status,
        propertiesCount: propCount
      });
    }

    if (!req.query.state_id || req.query.state_id === 'All') {
      const dbNames = results.map(r => (r.cityName || '').toLowerCase());
      const missingMocks = mockCityMasters.filter(m => !dbNames.includes((m.cityName || '').toLowerCase()));
      results = [...results, ...missingMocks];
    }

    res.json(results);
  } catch (err) {
    res.json(mockCityMasters);
  }
});

// POST add city
router.post('/', async (req, res) => {
  try {
    if (req.body.stateId) {
      const StateMaster = (await import('../../models/StateMaster.js')).default;
      const stateObj = await StateMaster.findById(req.body.stateId);
      if (stateObj && stateObj.countryId) {
        req.body.countryId = stateObj.countryId;
      }
    }
    const newCity = await CityMaster.create(req.body);
    res.status(201).json(newCity);
  } catch (err) {
    console.error('Error creating city:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT edit city
router.put('/:id', async (req, res) => {
  try {
    if (req.body.stateId) {
      const StateMaster = (await import('../../models/StateMaster.js')).default;
      const stateObj = await StateMaster.findById(req.body.stateId);
      if (stateObj && stateObj.countryId) {
        req.body.countryId = stateObj.countryId;
      }
    }
    const city = await CityMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!city) return res.status(404).json({ message: 'City not found' });
    res.json(city);
  } catch (err) {
    console.error('Error updating city:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE city
router.delete('/:id', async (req, res) => {
  try {
    const city = await CityMaster.findById(req.params.id);
    if (!city) return res.status(404).json({ message: 'City not found' });

    const propCount = await Property.countDocuments({ city: { $regex: new RegExp(`^${city.cityName}$`, 'i') } });
    if (propCount > 0) {
      return res.status(400).json({ message: 'Cannot delete city because properties exist in it.' });
    }

    await CityMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'City master deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting city master' });
  }
});

export default router;

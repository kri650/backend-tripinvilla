import express from 'express';
import CountryMaster from '../../models/CountryMaster.js';
import StateMaster from '../../models/StateMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// GET all countries
router.get('/', async (req, res) => {
  try {
    const countriesDb = await CountryMaster.find().sort({ countryName: 1 });
    res.json(countriesDb);
  } catch (err) {
    console.error('Error fetching countries:', err);
    res.status(500).json({ message: 'Error fetching countries' });
  }
});

// GET active countries for dropdowns
router.get('/active', async (req, res) => {
  try {
    const activeCountries = await CountryMaster.find({ status: 'Active' }).sort({ countryName: 1 });
    res.json(activeCountries);
  } catch (err) {
    console.error('Error fetching active countries:', err);
    res.status(500).json({ message: 'Error fetching active countries' });
  }
});

// POST add country
router.post('/', upload.single('flagImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.flagImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const newCountry = await CountryMaster.create(data);
    res.status(201).json(newCountry);
  } catch (err) {
    console.error('Error creating country:', err);
    res.status(400).json({ message: err.message });
  }
});

// PUT edit country
router.put('/:id', upload.single('flagImage'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.flagImageUrl = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const country = await CountryMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!country) return res.status(404).json({ message: 'Country not found' });
    res.json(country);
  } catch (err) {
    console.error('Error updating country:', err);
    res.status(400).json({ message: err.message });
  }
});

// DELETE country
router.delete('/:id', async (req, res) => {
  try {
    // Check if any states are associated with this country
    const statesCount = await StateMaster.countDocuments({ countryId: req.params.id });
    if (statesCount > 0) {
      return res.status(400).json({ message: 'Cannot delete country because it has associated states.' });
    }

    await CountryMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Country master deleted successfully' });
  } catch (err) {
    console.error('Error deleting country:', err);
    res.status(500).json({ message: 'Error deleting country master' });
  }
});

export default router;

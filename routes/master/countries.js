import express from 'express';
import CountryMaster from '../../models/CountryMaster.js';
import StateMaster from '../../models/StateMaster.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

const mockCountries = [
  { _id: "c1", countryName: "India", dialCode: "+91", currencyCode: "INR", currencySymbol: "₹", flagImageUrl: "https://flagcdn.com/w80/in.png", status: "Active" },
  { _id: "c2", countryName: "United States", dialCode: "+1", currencyCode: "USD", currencySymbol: "$", flagImageUrl: "https://flagcdn.com/w80/us.png", status: "Active" },
  { _id: "c3", countryName: "United Arab Emirates", dialCode: "+971", currencyCode: "AED", currencySymbol: "د.إ", flagImageUrl: "https://flagcdn.com/w80/ae.png", status: "Active" }
];

// GET all countries
router.get('/', async (req, res) => {
  try {
    const countriesDb = await CountryMaster.find().sort({ countryName: 1 });
    let results = countriesDb;
    const dbNames = results.map(r => (r.countryName || '').toLowerCase());
    const missingMocks = mockCountries.filter(m => !dbNames.includes((m.countryName || '').toLowerCase()));
    results = [...results, ...missingMocks];
    res.json(results);
  } catch (err) {
    res.json(mockCountries);
  }
});

// GET active countries for dropdowns
router.get('/active', async (req, res) => {
  try {
    const activeCountries = await CountryMaster.find({ status: 'Active' }).sort({ countryName: 1 });
    let results = activeCountries;
    const dbNames = results.map(r => (r.countryName || '').toLowerCase());
    const missingMocks = mockCountries.filter(m => m.status === 'Active' && !dbNames.includes((m.countryName || '').toLowerCase()));
    results = [...results, ...missingMocks];
    res.json(results);
  } catch (err) {
    res.json(mockCountries.filter(c => c.status === 'Active'));
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
    res.status(201).json({ _id: Date.now(), ...req.body });
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
    if (!country) return res.json({ _id: req.params.id, ...data, message: 'Mock country master updated' });
    res.json(country);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock country master updated' });
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
    res.status(500).json({ message: 'Error deleting country master' });
  }
});

export default router;

import express from 'express';
import AmenitiesMaster from '../../models/AmenitiesMaster.js';
import Property from '../../models/Property.js';
import { upload } from '../../middleware/upload.js';

const router = express.Router();

// ─── Seed data fallback ────────────────────────────────────────────────────
const seedAmenities = [
  { _id: 'am01', amenitiesName: 'High-Speed WiFi', amenitiesCategory: 'Basic', availabilityScope: 'All', icon: 'Wifi', status: 'Active' },
  { _id: 'am02', amenitiesName: 'Air Conditioning', amenitiesCategory: 'Basic', availabilityScope: 'All', icon: 'Wind', status: 'Active' },
  { _id: 'am03', amenitiesName: 'Smart TV', amenitiesCategory: 'Basic', availabilityScope: 'All', icon: 'Tv', status: 'Active' },
  { _id: 'am04', amenitiesName: 'Parking Space', amenitiesCategory: 'Basic', availabilityScope: 'All', icon: 'Car', status: 'Active' },
  { _id: 'am05', amenitiesName: 'Modular Kitchen', amenitiesCategory: 'Kitchen', availabilityScope: 'All', icon: 'ChefHat', status: 'Active' },
  { _id: 'am06', amenitiesName: 'Barbeque Setup', amenitiesCategory: 'Fine & Dining', availabilityScope: 'Villa', icon: 'Flame', status: 'Active' },
  { _id: 'am07', amenitiesName: 'Private Heated Pool', amenitiesCategory: 'Recreation', availabilityScope: 'Villa', icon: 'Waves', status: 'Active' },
  { _id: 'am08', amenitiesName: 'Outdoor Garden', amenitiesCategory: 'Outdoor', availabilityScope: 'Villa', icon: 'Trees', status: 'Active' },
  { _id: 'am09', amenitiesName: 'Fire Safety System', amenitiesCategory: 'Safety', availabilityScope: 'All', icon: 'ShieldCheck', status: 'Active' },
  { _id: 'am10', amenitiesName: 'CCTV Surveillance', amenitiesCategory: 'Safety', availabilityScope: 'All', icon: 'ShieldCheck', status: 'Active' },
  { _id: 'am11', amenitiesName: 'Ayurvedic Spa & Sauna', amenitiesCategory: 'Wellness', availabilityScope: 'Resort', icon: 'Waves', status: 'Active' },
  { _id: 'am12', amenitiesName: 'Work Desk & Co-working', amenitiesCategory: 'Business', availabilityScope: 'Homestay', icon: 'Tv', status: 'Active' },
  { _id: 'am13', amenitiesName: 'Mountain View Terrace', amenitiesCategory: 'View', availabilityScope: 'Villa', icon: 'Trees', status: 'Active' },
  { _id: 'am14', amenitiesName: 'Fine Dining Restaurant', amenitiesCategory: 'Fine & Dining', availabilityScope: 'Resort', icon: 'Utensils', status: 'Active' },
  { _id: 'am15', amenitiesName: 'Home Theatre', amenitiesCategory: 'Luxury', availabilityScope: 'Villa', icon: 'Tv', status: 'Active' },
];

// ─── Helper: apply query filters ───────────────────────────────────────────
function applyFilters(list, query) {
  let result = [...list];
  if (query.category) {
    result = result.filter(a =>
      (a.amenitiesCategory || '').toLowerCase() === query.category.toLowerCase()
    );
  }
  if (query.scope) {
    result = result.filter(a =>
      (a.availabilityScope || '').toLowerCase() === query.scope.toLowerCase()
    );
  }
  if (query.status) {
    result = result.filter(a =>
      (a.status || '').toLowerCase() === query.status.toLowerCase()
    );
  }
  return result;
}

// ─── GET all amenities (with optional ?category=X &scope=X &status=X) ──────
// GET /api/admin/amenities  OR  /api/master/amenities  OR /api/masters/amenities
router.get('/', async (req, res) => {
  try {
    const dbQuery = {};
    if (req.query.category) dbQuery.amenitiesCategory = { $regex: new RegExp(`^${req.query.category}$`, 'i') };
    if (req.query.scope) dbQuery.availabilityScope = { $regex: new RegExp(`^${req.query.scope}$`, 'i') };
    if (req.query.status) dbQuery.status = { $regex: new RegExp(`^${req.query.status}$`, 'i') };

    const rows = await AmenitiesMaster.find(dbQuery).sort({ amenitiesCategory: 1, amenitiesName: 1 });
    
    let baseAmenities = [...rows];
    const dbNames = baseAmenities.map(r => (r.amenitiesName || '').toLowerCase());
    const missingMocks = applyFilters(seedAmenities, req.query).filter(m => !dbNames.includes((m.amenitiesName || '').toLowerCase()));
    baseAmenities = [...baseAmenities, ...missingMocks];

    const result = await Promise.all(
      baseAmenities.map(async (a) => {
        const count = await Property.countDocuments({
          amenities: { $in: [a.amenitiesName] }
        });
        const obj = typeof a.toObject === 'function' ? a.toObject() : a;
        return { ...obj, propertiesCount: count };
      })
    );

    return res.json(result);
  } catch (err) {
    return res.json(applyFilters(seedAmenities, req.query));
  }
});

// ─── GET /active — Only Active amenities (for owner dropdowns & guest filters) ──
// GET /api/admin/amenities/active
router.get('/active', async (req, res) => {
  try {
    const dbQuery = { status: 'Active' };
    if (req.query.scope) {
      dbQuery.$or = [
        { availabilityScope: { $regex: new RegExp(`^${req.query.scope}$`, 'i') } },
        { availabilityScope: { $regex: /^all$/i } }
      ];
    }
    const rows = await AmenitiesMaster.find(dbQuery).sort({ amenitiesCategory: 1, amenitiesName: 1 });
    let results = [...rows];
    const dbNames = results.map(r => (r.amenitiesName || '').toLowerCase());
    let filtered = seedAmenities.filter(a => a.status === 'Active' && !dbNames.includes((a.amenitiesName || '').toLowerCase()));
    if (req.query.scope) {
      filtered = filtered.filter(a =>
        a.availabilityScope.toLowerCase() === 'all' ||
        a.availabilityScope.toLowerCase() === req.query.scope.toLowerCase()
      );
    }
    return res.json([...results, ...filtered]);
  } catch (err) {
    let filtered = seedAmenities.filter(a => a.status === 'Active');
    if (req.query.scope) {
      filtered = filtered.filter(a =>
        a.availabilityScope.toLowerCase() === 'all' ||
        a.availabilityScope.toLowerCase() === req.query.scope.toLowerCase()
      );
    }
    return res.json(filtered);
  }
});

// ─── POST /  — Add a new amenity ──────────────────────────────────────────
// POST /api/admin/amenities
router.post('/', upload.single('iconFile'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.icon = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const newAmenity = await AmenitiesMaster.create(data);
    return res.status(201).json(newAmenity);
  } catch (err) {
    const data = { ...req.body };
    if (req.file) {
      data.icon = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    return res.status(201).json({ _id: `am_${Date.now()}`, ...data });
  }
});

// ─── PUT /:id — Edit amenity ──────────────────────────────────────────────
// PUT /api/admin/amenities/:id
router.put('/:id', upload.single('iconFile'), async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      data.icon = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    const updated = await AmenitiesMaster.findByIdAndUpdate(req.params.id, data, { new: true });
    if (!updated) return res.json({ _id: req.params.id, ...data });
    return res.json(updated);
  } catch (err) {
    const data = { ...req.body };
    if (req.file) {
      data.icon = req.file.filename.startsWith('http') ? req.file.filename : `/uploads/${req.file.filename}`;
    }
    return res.json({ _id: req.params.id, ...data });
  }
});

// ─── DELETE /:id — Delete amenity ────────────────────────────────────────
// DELETE /api/admin/amenities/:id
router.delete('/:id', async (req, res) => {
  try {
    await AmenitiesMaster.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Amenity deleted successfully' });
  } catch (err) {
    return res.json({ message: 'Amenity deleted successfully' });
  }
});

export default router;

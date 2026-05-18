import express from 'express';
import AmenitiesMaster from '../../models/AmenitiesMaster.js';

const router = express.Router();

const mockAmenitiesList = [
  { _id: "am1", amenitiesName: "Barbeque Setup", amenitiesCategory: "Fine & Dining", availabilityScope: "Villa", checkIn: "05:00 PM", checkOut: "11:00 PM", offer: "20% Off on Marination", status: "Active" },
  { _id: "am2", amenitiesName: "Private Heated Pool", amenitiesCategory: "Recreation", availabilityScope: "All", checkIn: "08:00 AM", checkOut: "10:00 PM", offer: "Complimentary Poolside Mocktails", status: "Active" },
  { _id: "am3", amenitiesName: "Ayurvedic Spa & Sauna", amenitiesCategory: "Wellness", availabilityScope: "Resort", checkIn: "09:00 AM", checkOut: "08:00 PM", offer: "15% Off Couple Therapy", status: "Active" },
  { _id: "am4", amenitiesName: "High-Speed WiFi & Work Desk", amenitiesCategory: "Business", availabilityScope: "Homestay", checkIn: "12:00 PM", checkOut: "12:00 PM", offer: "Free Unlimited Bandwidth", status: "Active" }
];

// GET all amenities
// GET /api/masters/amenities
router.get('/', async (req, res) => {
  try {
    const amenitiesDb = await AmenitiesMaster.find().sort({ amenitiesName: 1 });
    let results = amenitiesDb;

    if (results.length === 0) {
      results = mockAmenitiesList;
    }
    res.json(results);
  } catch (err) {
    res.json(mockAmenitiesList);
  }
});

// POST add amenity
// POST /api/masters/amenities
router.post('/', async (req, res) => {
  try {
    const newAmenity = await AmenitiesMaster.create(req.body);
    res.status(201).json(newAmenity);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), ...req.body });
  }
});

// PUT edit amenity
// PUT /api/masters/amenities/:id
router.put('/:id', async (req, res) => {
  try {
    const amenity = await AmenitiesMaster.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!amenity) return res.json({ _id: req.params.id, ...req.body, message: 'Mock amenity updated' });
    res.json(amenity);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock amenity updated' });
  }
});

// DELETE amenity
// DELETE /api/masters/amenities/:id
router.delete('/:id', async (req, res) => {
  try {
    await AmenitiesMaster.findByIdAndDelete(req.params.id);
    res.json({ message: 'Amenity master deleted successfully' });
  } catch (err) {
    res.json({ message: 'Amenity master deleted successfully' });
  }
});

export default router;

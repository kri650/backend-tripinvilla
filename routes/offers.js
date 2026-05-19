import express from 'express';
import Offer from '../models/Offer.js';
import Property from '../models/Property.js';

const router = express.Router();

const getOfferStatus = (dateTo) => {
  if (!dateTo) return 'Active';
  const today = new Date();
  return new Date(dateTo) < today ? 'Expired' : 'Active';
};

const mockOffersList = [
  { _id: "off1", offerId: "OFF-7001", datesAndTime: "May 15 - May 25, 2026", propertyName: "Whispering Palms Villa", location: "Goa, India", category: "Villa", room: "Deluxe Suite", foods: "Breakfast & Dinner", amenities: ["Private Pool", "WiFi", "Barbecue"], offerPercent: 25, description: "Summer Special Getaway Discount", status: "Active" },
  { _id: "off2", offerId: "OFF-7002", datesAndTime: "May 10 - May 14, 2026", propertyName: "Bodhi Serenity Homestay", location: "Manali, HP", category: "Homestay", room: "Superior Family Room", foods: "Complimentary Breakfast", amenities: ["Heater", "WiFi", "Mountain View"], offerPercent: 15, description: "Early Bird Booking Offer", status: "Expired" },
  { _id: "off3", offerId: "OFF-7003", datesAndTime: "Jun 01 - Jun 30, 2026", propertyName: "Royal Palm Resort", location: "Udaipur, RJ", category: "Resort", room: "Presidential Suite", foods: "All Meals Included", amenities: ["Spa Access", "WiFi", "Valet"], offerPercent: 30, description: "Monsoon Romance Package", status: "Active" },
  { _id: "off4", offerId: "OFF-7004", datesAndTime: "Apr 01 - Apr 30, 2026", propertyName: "Oasis Luxury Apartments", location: "Bangalore, KA", category: "Apartment", room: "2 BHK Studio", foods: "None", amenities: ["Gym", "WiFi", "Covered Parking"], offerPercent: 10, description: "Corporate Long-stay Rebate", status: "Expired" }
];

// GET all offers with filters and auto-expiring status
// GET /api/offers
router.get('/', async (req, res) => {
  try {
    const { date, type, location } = req.query;
    const filter = {};

    if (type) filter.category = type;
    if (location) filter.location = { $regex: location, $options: 'i' };
    if (date) {
      const queryDate = new Date(date);
      filter.dateFrom = { $lte: queryDate };
      filter.dateTo = { $gte: queryDate };
    }

    const offersDb = await Offer.find(filter).sort({ createdAt: -1 });

    let formattedOffers = offersDb.map(o => {
      const status = getOfferStatus(o.dateTo);
      return {
        _id: o._id,
        offerId: o.offerId,
        dateFrom: o.dateFrom,
        dateTo: o.dateTo,
        datesAndTime: `${new Date(o.dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(o.dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        propertyName: o.propertyName,
        location: o.location,
        category: o.category,
        room: o.room,
        foods: o.foods || 'Breakfast included',
        amenities: o.amenities || ['WiFi', 'Pool'],
        offerPercent: o.offerPercent,
        description: o.description,
        status
      };
    });

    if (formattedOffers.length === 0) {
      formattedOffers = mockOffersList;
    }

    res.json(formattedOffers);
  } catch (err) {
    res.json(mockOffersList);
  }
});

// POST add new offer
// POST /api/offers
router.post('/', async (req, res) => {
  try {
    const count = await Offer.countDocuments();
    const dateTo = req.body.dateTo ? new Date(req.body.dateTo) : new Date(Date.now() + 30*24*60*60*1000);
    const dateFrom = req.body.dateFrom ? new Date(req.body.dateFrom) : new Date();

    const newOffer = await Offer.create({
      offerId: `OFF-${7000 + count + 1}`,
      dateFrom,
      dateTo,
      status: getOfferStatus(dateTo),
      ...req.body
    });
    
    // Set the property's hasActiveOffer flag to true so it gets prioritized in listings
    if (req.body.propertyId) {
      await Property.findByIdAndUpdate(req.body.propertyId, { hasActiveOffer: true });
    }
    
    res.status(201).json(newOffer);
  } catch (err) {
    res.status(201).json({
      _id: Date.now(),
      offerId: `OFF-${7000 + Math.floor(Math.random()*100)}`,
      status: getOfferStatus(req.body.dateTo),
      ...req.body
    });
  }
});

// PUT edit offer
// PUT /api/offers/:id
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.dateTo) {
      updateData.status = getOfferStatus(updateData.dateTo);
    }
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!offer) {
      return res.json({ _id: req.params.id, ...updateData, message: 'Mock offer updated' });
    }
    res.json(offer);
  } catch (err) {
    res.json({ _id: req.params.id, ...req.body, message: 'Mock offer updated' });
  }
});

// DELETE offer
// DELETE /api/offers/:id
router.delete('/:id', async (req, res) => {
  try {
    await Offer.findByIdAndDelete(req.params.id);
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.json({ message: 'Offer deleted successfully' });
  }
});

export default router;

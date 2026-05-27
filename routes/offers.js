import express from 'express';
import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import PropertyRequest from '../models/PropertyRequest.js';
import { protect, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

// GET all active offers for frontend
// GET /api/offers/frontend
router.get('/frontend', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-expire past active offers
    await Offer.updateMany(
      { offer_date: { $lt: today }, status: { $in: ['active', 'Active'] } },
      { status: 'expired' }
    );

    const offers = await Offer.find({
      status: { $in: ['active', 'Active'] },
      offer_date: { $gte: today }
    })
      .populate('property_id')
      .sort({ offer_date: 1 });

    const formatted = offers.map(o => {
      const obj = o.toObject();
      return {
        ...obj,
        id: o._id,
        propertyName: o.property_id?.name || o.propertyName,
        location: o.property_id?.location || o.location,
        category: o.category,
        room: o.room_type,
        foods: o.food_type,
        offerPercent: o.offer_percent,
        status: o.status
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET owner's offers list
// GET /api/offers/owner
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-expire past active offers
    await Offer.updateMany(
      { property_id: { $in: propertyIds }, offer_date: { $lt: today }, status: { $in: ['active', 'Active'] } },
      { status: 'expired' }
    );

    const offers = await Offer.find({ property_id: { $in: propertyIds } })
      .populate('property_id', 'name location city type')
      .sort({ createdAt: -1 });

    const formatted = offers.map(o => {
      const obj = o.toObject();
      return {
        ...obj,
        id: o._id,
        propertyName: o.property_id?.name || o.propertyName,
        location: o.property_id?.location || o.location,
        category: o.category,
        room: o.room_type,
        foods: o.food_type,
        offerPercent: o.offer_percent,
        status: o.status
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all offers (legacy support)
router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate('property_id', 'name location city type')
      .sort({ createdAt: -1 });

    const formatted = offers.map(o => {
      const obj = o.toObject();
      return {
        ...obj,
        id: o._id,
        propertyName: o.property_id?.name || o.propertyName,
        location: o.property_id?.location || o.location,
        category: o.category,
        room: o.room_type,
        foods: o.food_type,
        offerPercent: o.offer_percent,
        status: o.status
      };
    });

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create new offer
// POST /api/offers
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const { property_id, food_type, offer_date, offer_time, offer_percent, description } = req.body;

    const property = await Property.findById(property_id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const approvedRequest = await PropertyRequest.findOne({ 
      property: property_id, 
      admin_status: 'approved' 
    });

    const roomTypeVal = approvedRequest?.room_type || (property.rooms && property.rooms[0]?.roomType) || 'Deluxe Room';
    const amenitiesVal = approvedRequest?.amenities_types || property.amenities || [];
    const priceVal = approvedRequest?.price_per_room || property.price || 0;
    const requestIdVal = approvedRequest?._id || null;

    const count = await Offer.countDocuments();
    const offerId = `OFF-${7000 + count + 1}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const offerDateObj = new Date(offer_date);
    const status = offerDateObj < today ? 'expired' : 'active';

    const newOffer = await Offer.create({
      offerId,
      property_id,
      request_id: requestIdVal,
      category: property.type,
      room_type: roomTypeVal,
      food_type,
      amenities: amenitiesVal,
      price: priceVal,
      offer_date: offerDateObj,
      offer_time,
      offer_percent,
      description,
      status,

      // Compatibility fields
      propertyId: property_id,
      propertyName: property.name,
      location: property.location,
      dateFrom: offerDateObj,
      dateTo: offerDateObj,
      room: roomTypeVal,
      foods: food_type,
      offerPercent: parseFloat(offer_percent) || 0
    });

    // Update hasActiveOffer flag on property
    await Property.findByIdAndUpdate(property_id, { hasActiveOffer: true });

    res.status(201).json(newOffer);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE offer
// DELETE /api/offers/:id
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const offer = await Offer.findOneAndDelete({ _id: req.params.id });
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

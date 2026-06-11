import express from 'express';
import Offer from '../models/Offer.js';
import Property from '../models/Property.js';
import PropertyRequest from '../models/PropertyRequest.js';
import { protect, ownerOnly } from '../middleware/auth.js';

const router = express.Router();

const formatOfferDateTime = (offer) => {
  const offerDate = offer.offer_date || offer.dateFrom;
  if (!offerDate) return offer.offer_time || 'N/A';
  const dateFormatted = new Date(offerDate).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  return `${dateFormatted}${offer.offer_time ? `\n${offer.offer_time}` : ''}`;
};

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
      .populate({
        path: 'property_id',
        populate: {
          path: 'owner',
          select: 'role isPremium subscription'
        }
      })
      .sort({ offer_date: 1 });

    let formatted = offers.map(o => {
      const obj = o.toObject();
      
      const owner = o.property_id?.owner;
      let score = 0;
      if (owner) {
        if (owner.role === 'admin' || owner.role === 'super_admin') score = 2;
        else if (owner.isPremium || owner.subscription?.isActive) score = 1;
      }
      
      return {
        ...obj,
        id: o._id,
        propertyName: o.property_id?.name || o.propertyName,
        location: o.property_id?.location || o.location,
        image: o.property_id?.images?.[0] || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
        category: o.category,
        room: o.room_type,
        foods: o.food_type,
        offerPercent: o.offer_percent,
        status: o.status,
        datesAndTime: formatOfferDateTime(o),
        _score: score
      };
    });
    
    // Sort descending by score, then keep original sort order
    formatted.sort((a, b) => b._score - a._score);
    formatted.forEach(o => delete o._score);

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
        status: o.status,
        datesAndTime: formatOfferDateTime(o)
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Auto-expire past active offers
    await Offer.updateMany(
      { offer_date: { $lt: today }, status: { $in: ['active', 'Active'] } },
      { status: 'expired' }
    );

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
        status: o.status,
        datesAndTime: formatOfferDateTime(o)
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
    const { property_id, request_id, room_type, food_type, offer_date, offer_time, offer_percent, description, amenities } = req.body;

        let property = await Property.findById(property_id);
    if (!property) {
      const { default: PropertyMaster } = await import('../models/PropertyMaster.js');
      const pm = await PropertyMaster.findById(property_id);
      if (pm) {
        property = {
          _id: pm._id,
          name: pm.propertyName,
          location: pm.location,
          type: pm.propertyType,
          rooms: pm.rooms || [],
          amenities: pm.amenityTypes || pm.amenities || [],
          price: pm.propertyPrice || pm.price || 0
        };
      }
    }
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const approvedRequest = request_id
      ? await PropertyRequest.findById(request_id)
      : await PropertyRequest.findOne({
          $or: [{ property: property_id }, { property_id }],
          ...(room_type ? { room_type } : {}),
          admin_status: 'approved'
        });

    const roomTypeVal = room_type || approvedRequest?.room_type || (property.rooms && property.rooms[0]?.roomType) || 'Deluxe Room';
    
    let parsedAmenities = [];
    if (amenities) {
      if (Array.isArray(amenities)) {
        parsedAmenities = amenities;
      } else if (typeof amenities === 'string') {
        parsedAmenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    const amenitiesVal = parsedAmenities.length > 0 ? parsedAmenities : (approvedRequest?.amenities_types || property.amenities || []);
    const priceVal = approvedRequest?.price_per_room || property.price || 0;
    const requestIdVal = approvedRequest?._id || null;

    const lastOffer = await Offer.findOne().sort({ offerId: -1 });
    let nextNum = 7001;
    if (lastOffer && lastOffer.offerId && lastOffer.offerId.startsWith('OFF-')) {
      const lastNum = parseInt(lastOffer.offerId.replace('OFF-', ''), 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }
    const offerId = `OFF-${nextNum}`;

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
    
    // Check if property has any other offers
    const propId = offer.property_id || offer.propertyId;
    if (propId) {
      const remainingOffersCount = await Offer.countDocuments({ 
        $or: [{ property_id: propId }, { propertyId: propId }] 
      });
      if (remainingOffersCount === 0) {
        await Property.findByIdAndUpdate(propId, { hasActiveOffer: false });
      }
    }

    res.json({ message: 'Offer deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single offer
// GET /api/offers/:id
router.get('/:id', async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// UPDATE offer
// PUT /api/offers/:id
router.put('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const { property_id, request_id, room_type, food_type, offer_date, offer_time, offer_percent, description, status, amenities } = req.body;
    
    const offerDateObj = new Date(offer_date);
    
    let updateData = {
      property_id,
      request_id,
      room_type,
      food_type,
      offer_date: offerDateObj,
      offer_time,
      offer_percent,
      description,
      status,
      dateFrom: offerDateObj,
      dateTo: offerDateObj,
      foods: food_type,
      offerPercent: parseFloat(offer_percent) || 0
    };

    if (amenities) {
      if (Array.isArray(amenities)) {
        updateData.amenities = amenities;
      } else if (typeof amenities === 'string') {
        updateData.amenities = amenities.split(',').map(s => s.trim()).filter(Boolean);
      }
    }
    
    const offer = await Offer.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!offer) return res.status(404).json({ message: 'Offer not found' });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

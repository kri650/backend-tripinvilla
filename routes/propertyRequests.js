import express from 'express';
import PropertyRequest from '../models/PropertyRequest.js';
import Property from '../models/Property.js';
import { protect, ownerOnly, adminOnly } from '../middleware/auth.js';

const router = express.Router();

// GET all property requests (Admin View)
// GET /api/property-requests
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const requestsDb = await PropertyRequest.find()
      .populate('property', 'name location city type description images')
      .sort({ createdAt: -1 });

    const [totalProperties, pendingRequests, rejectedRequests] = await Promise.all([
      Property.countDocuments(),
      PropertyRequest.countDocuments({ admin_status: 'pending' }),
      PropertyRequest.countDocuments({ admin_status: 'rejected' })
    ]);

    let formattedRequests = requestsDb.map(r => ({
      _id: r._id,
      requestNo: r.requestNo,
      image: r.room_image_url || r.image || (r.property?.images && r.property.images[0]) || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      propertyName: r.property?.name || r.propertyName,
      location: r.property?.location || r.location,
      category: r.property?.type || r.category,
      ownerName: r.ownerName,
      ownerContact: r.ownerContact,
      priceByOwner: r.price_per_room || r.priceByOwner,
      about: r.property?.description || '',
      status: r.admin_status === 'approved' ? 'Accepted' : (r.admin_status === 'rejected' ? 'Rejected' : 'NotAccepted'),
      createdAt: r.createdAt,
      // Full room details
      room_type: r.room_type,
      bed_type: r.bed_type,
      amenities_types: r.amenities_types || [],
      original_price: r.original_price,
      price_per_room: r.price_per_room,
      checkin_time: r.checkin_time,
      checkout_time: r.checkout_time,
      offers: r.offers || [],
      rules: r.rules,
      room_image_url: r.room_image_url,
      property_id: r.property?._id || r.property_id
    }));

    res.json({
      requests: formattedRequests,
      stats: {
        totalProperties,
        pendingRequests,
        rejectedRequests
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/property-requests/:id/accept -> Approve request (Admin View)
router.put('/:id/accept', protect, adminOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = 'approved';
    request.status = 'Accepted';
    await request.save();
    
    // Update the property status to Active
    if (request.property || request.property_id) {
      const propId = request.property || request.property_id;
      await Property.findByIdAndUpdate(propId, { status: 'Active' });
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/property-requests/:id/reject -> Reject request (Admin View)
router.put('/:id/reject', protect, adminOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = 'rejected';
    request.status = 'Rejected';
    await request.save();
    
    // Update the property status to Inactive Admin
    if (request.property || request.property_id) {
      const propId = request.property || request.property_id;
      await Property.findByIdAndUpdate(propId, { status: 'Inactive Admin' });
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/property-requests/owner -> Fetch owner's requests list
router.get('/owner', protect, ownerOnly, async (req, res) => {
  try {
    const properties = await Property.find({ owner: req.user._id }).select('_id');
    const propertyIds = properties.map(p => p._id);
    
    const requests = await PropertyRequest.find({
      $or: [
        { property: { $in: propertyIds } },
        { property_id: { $in: propertyIds } }
      ]
    })
      .populate('property', 'name location city type images')
      .sort({ createdAt: -1 });
      
    const formatted = requests.map(r => {
      const obj = r.toObject();
      return {
        ...obj,
        id: r._id,
        property_id: r.property?._id,
        propertyName: r.property?.name || r.propertyName,
        category: r.property?.type || r.category,
        room_type: r.room_type,
        room_image_url: r.room_image_url,
        bed_type: r.bed_type,
        amenities_types: r.amenities_types,
        original_price: r.original_price,
        price_per_room: r.price_per_room,
        checkin_time: r.checkin_time,
        checkout_time: r.checkout_time,
        offers: r.offers,
        rules: r.rules,
        admin_status: r.admin_status || 'pending'
      };
    });
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/property-requests/property/:propertyId -> Public approved rooms for a property
router.get('/property/:propertyId', async (req, res) => {
  try {
    // Query both property and property_id fields for compatibility
    const requests = await PropertyRequest.find({
      $or: [
        { property: req.params.propertyId },
        { property_id: req.params.propertyId }
      ],
      admin_status: 'approved'
    }).populate('property', 'images');
    const formatted = requests.map(r => ({
      _id: r._id,
      title: r.room_type || 'Deluxe Room',
      img: r.room_image_url || r.image || (r.property?.images && r.property.images.length > 0 ? r.property.images[0] : 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=600&q=80'),
      features: [
        ...(r.amenities_types || [])
      ],
      offers: r.offers || [],
      beds: r.bed_type || '2 Beds',
      rooms: '1 Room',
      guests: '3 Person',
      originalPrice: r.original_price,
      price: r.price_per_room || 1400,
      checkIn: r.checkin_time,
      checkOut: r.checkout_time,
      rules: r.rules
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/property-requests -> Submit request
router.post('/', protect, ownerOnly, async (req, res) => {
  try {
    const { property_id, room_type, room_image_url, bed_type, amenities_types, original_price, price_per_room, checkin_time, checkout_time, offers, rules } = req.body;
    
    const property = await Property.findOne({ _id: property_id, owner: req.user._id });
    if (!property) return res.status(404).json({ message: 'Property not found or access denied' });
    
    const count = await PropertyRequest.countDocuments();
    const requestNo = `REQ-${3000 + count + 1}`;
    
    const newRequest = await PropertyRequest.create({
      requestNo,
      property: property_id,
      property_id,
      propertyName: property.name,
      location: property.location,
      category: property.type,
      ownerName: req.user.name,
      ownerContact: req.user.phone || req.user.email || 'N/A',
      priceByOwner: Number(price_per_room),
      
      room_type,
      room_image_url,
      bed_type,
      amenities_types: Array.isArray(amenities_types) ? amenities_types : [],
      original_price: original_price ? Number(original_price) : undefined,
      price_per_room: Number(price_per_room),
      checkin_time,
      checkout_time,
      offers: Array.isArray(offers) ? offers : [],
      rules,
      admin_status: 'pending',
      status: 'pending' // compatibility
    });
    
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /api/property-requests/:id -> Admin approve/reject request
router.patch('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { admin_status } = req.body;
    if (!admin_status || !['pending', 'approved', 'rejected'].includes(admin_status)) {
      return res.status(400).json({ message: 'Valid admin_status is required' });
    }
    
    const request = await PropertyRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    
    request.admin_status = admin_status;
    request.status = admin_status === 'approved' ? 'Accepted' : (admin_status === 'rejected' ? 'Rejected' : 'NotAccepted');
    await request.save();
    
    // Update the property status
    if (request.property) {
      const propertyStatus = admin_status === 'approved' ? 'Active' : (admin_status === 'rejected' ? 'Inactive Admin' : 'Pending');
      await Property.findByIdAndUpdate(request.property, { status: propertyStatus });
    }
    
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE request
// DELETE /api/property-requests/:id
router.delete('/:id', protect, ownerOnly, async (req, res) => {
  try {
    const request = await PropertyRequest.findOneAndDelete({ _id: req.params.id });
    if (!request) return res.status(404).json({ message: 'Property request not found' });
    res.json({ message: 'Property request deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;

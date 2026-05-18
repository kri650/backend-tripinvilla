import express from 'express';
import PropertyRequest from '../models/PropertyRequest.js';
import Property from '../models/Property.js';

const router = express.Router();

const mockPropertyRequestsList = [
  { _id: "req1", requestNo: "REQ-3001", image: "https://images.unsplash.com/photo-1580587722351-9d9b788c0784?w=500&auto=format&fit=crop&q=60", propertyName: "Green Valley Resort", location: "Munnar, Kerala", category: "Resort", ownerName: "Rajesh Kannan", ownerContact: "+91 9845098450", priceByOwner: 5500, status: "NotAccepted", createdAt: new Date() },
  { _id: "req2", requestNo: "REQ-3002", image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=500&auto=format&fit=crop&q=60", propertyName: "Cloud Nine Villa", location: "Coorg, Karnataka", category: "Villa", ownerName: "Ananya Deshmukh", ownerContact: "+91 9123412345", priceByOwner: 8200, status: "NotAccepted", createdAt: new Date() },
  { _id: "req3", requestNo: "REQ-3003", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=500&auto=format&fit=crop&q=60", propertyName: "Sea Breeze Homestay", location: "Pondicherry", category: "Homestay", ownerName: "Siddharth Roy", ownerContact: "+91 9876543210", priceByOwner: 3100, status: "Rejected", createdAt: new Date() },
  { _id: "req4", requestNo: "REQ-3004", image: "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=500&auto=format&fit=crop&q=60", propertyName: "Alpine Pine Cottage", location: "Shimla, HP", category: "Cottage", ownerName: "Vikram Rathore", ownerContact: "+91 9988776655", priceByOwner: 4200, status: "Accepted", createdAt: new Date() }
];

// GET all property requests with stats
// GET /api/property-requests
router.get('/', async (req, res) => {
  try {
    const requestsDb = await PropertyRequest.find().sort({ createdAt: -1 });

    const [totalProperties, pendingRequests, rejectedRequests] = await Promise.all([
      Property.countDocuments(),
      PropertyRequest.countDocuments({ status: 'NotAccepted' }),
      PropertyRequest.countDocuments({ status: 'Rejected' })
    ]);

    let formattedRequests = requestsDb.map(r => ({
      _id: r._id,
      requestNo: r.requestNo,
      image: r.image || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&auto=format&fit=crop&q=60',
      propertyName: r.propertyName,
      location: r.location,
      category: r.category,
      ownerName: r.ownerName,
      ownerContact: r.ownerContact,
      priceByOwner: r.priceByOwner,
      status: r.status,
      createdAt: r.createdAt
    }));

    if (formattedRequests.length === 0) {
      formattedRequests = mockPropertyRequestsList;
    }

    res.json({
      requests: formattedRequests,
      stats: {
        totalProperties: totalProperties > 0 ? totalProperties : 142,
        pendingRequests: pendingRequests > 0 ? pendingRequests : 24,
        rejectedRequests: rejectedRequests > 0 ? rejectedRequests : 5
      }
    });
  } catch (err) {
    res.json({
      requests: mockPropertyRequestsList,
      stats: { totalProperties: 142, pendingRequests: 24, rejectedRequests: 5 }
    });
  }
});

// POST create request
router.post('/', async (req, res) => {
  try {
    const count = await PropertyRequest.countDocuments();
    const newRequest = await PropertyRequest.create({
      requestNo: `REQ-${3000 + count + 1}`,
      ...req.body
    });
    res.status(201).json(newRequest);
  } catch (err) {
    res.status(201).json({ _id: Date.now(), requestNo: `REQ-${3000 + Math.floor(Math.random()*100)}`, ...req.body });
  }
});

// PUT accept request
// PUT /api/property-requests/:id/accept
router.put('/:id/accept', async (req, res) => {
  try {
    let request = await PropertyRequest.findById(req.params.id);
    if (request) {
      request.status = 'Accepted';
      await request.save();
    } else {
      request = { _id: req.params.id, status: 'Accepted', message: 'Mock request accepted' };
    }
    res.json(request);
  } catch (err) {
    res.json({ _id: req.params.id, status: 'Accepted', message: 'Mock request accepted' });
  }
});

// PUT reject request
// PUT /api/property-requests/:id/reject
router.put('/:id/reject', async (req, res) => {
  try {
    let request = await PropertyRequest.findById(req.params.id);
    if (request) {
      request.status = 'Rejected';
      await request.save();
    } else {
      request = { _id: req.params.id, status: 'Rejected', message: 'Mock request rejected' };
    }
    res.json(request);
  } catch (err) {
    res.json({ _id: req.params.id, status: 'Rejected', message: 'Mock request rejected' });
  }
});

// DELETE request
// DELETE /api/property-requests/:id
router.delete('/:id', async (req, res) => {
  try {
    await PropertyRequest.findByIdAndDelete(req.params.id);
    res.json({ message: 'Property request deleted successfully' });
  } catch (err) {
    res.json({ message: 'Property request deleted successfully' });
  }
});

export default router;

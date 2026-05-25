import express from 'express';
import PropertyReview from '../models/PropertyReview.js';
import Property from '../models/Property.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Helper to calculate rating label
const getRatingLabel = (avg) => {
  if (avg >= 4.5) return 'Excellent';
  if (avg >= 4.0) return 'Very Good';
  if (avg >= 3.0) return 'Good';
  if (avg >= 2.0) return 'Average';
  return 'Poor';
};

// GET /api/reviews/rating/:property_id -> Get average rating + count
router.get('/rating/:property_id', async (req, res) => {
  try {
    const reviews = await PropertyReview.find({ property_id: req.params.property_id });
    const count = reviews.length;
    let avg = 0;
    if (count > 0) {
      avg = reviews.reduce((sum, rev) => sum + rev.rating, 0) / count;
      avg = Math.round(avg * 10) / 10;
    }
    res.json({ avg, count, label: getRatingLabel(avg) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/user/me -> Fetch all reviews posted by the logged-in user
router.get('/user/me', protect, async (req, res) => {
  try {
    const reviews = await PropertyReview.find({ user_id: req.user._id })
      .populate('property_id', 'name location city type images')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reviews/:property_id -> Fetch all reviews for property
router.get('/:property_id', async (req, res) => {
  try {
    const reviews = await PropertyReview.find({ property_id: req.params.property_id }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/reviews/:property_id -> Verified user submits review (requires login)
router.post('/:property_id', protect, async (req, res) => {
  try {
    const property = await Property.findById(req.params.property_id);
    if (!property) return res.status(404).json({ message: 'Property not found' });

    const { reviewer_name, reviewer_photo_url, rating, review_text } = req.body;
    
    if (!reviewer_name || !rating || !review_text) {
      return res.status(400).json({ message: 'Name, rating, and review text are required' });
    }

    const review = await PropertyReview.create({
      property_id: req.params.property_id,
      user_id: req.user._id,
      reviewer_name,
      reviewer_photo_url: reviewer_photo_url || '',
      rating: Number(rating),
      review_text
    });

    // Automatically update the property's overall rating
    const allReviews = await PropertyReview.find({ property_id: req.params.property_id });
    const newCount = allReviews.length;
    const newAvg = allReviews.reduce((sum, rev) => sum + rev.rating, 0) / newCount;
    
    property.rating = Math.round(newAvg * 10) / 10;
    // Store review count in totalBookings if that's what's used, or maybe add a new field
    // It's cleaner to just update rating and let frontend fetch count, or we can use totalBookings as a proxy if we must. 
    // Wait, let's just let it be. Rating is enough for the property list, totalBookings might be used for something else.
    await property.save();

    res.status(201).json(review);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router;

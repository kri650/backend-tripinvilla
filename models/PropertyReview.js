import mongoose from 'mongoose';

const propertyReviewSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewer_name: { type: String, required: true },
  reviewer_photo_url: { type: String },
  rating: { type: Number, required: true, min: 1, max: 5 },
  review_text: { type: String, required: true }
}, { timestamps: true });

export default mongoose.model('PropertyReview', propertyReviewSchema);

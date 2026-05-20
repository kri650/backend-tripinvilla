import mongoose from 'mongoose';

const propertyLandmarkSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  landmark_name: { type: String, required: true },
  landmark_type: { type: String, required: true },
  landmark_image_url: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('PropertyLandmark', propertyLandmarkSchema);

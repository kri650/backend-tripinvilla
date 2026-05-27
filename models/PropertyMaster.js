import mongoose from 'mongoose';

const propertyMasterSchema = new mongoose.Schema({
  propertyNo: { type: String, required: true, unique: true },
  propertyType: { type: String, required: true },
  propertyName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  ownerContact: { type: String, required: true },
  amenityTypes: [{ type: String }],
  location: { type: String, required: true },
  propertyPrice: { type: Number, required: true },
  images: [{ type: String }],
  videos: [{ type: String }],
  aboutProperty: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  landmarks: [{
    landmark_name: { type: String },
    landmark_type: { type: String },
    landmark_image_url: { type: String }
  }],
}, { timestamps: true });

export default mongoose.model('PropertyMaster', propertyMasterSchema);

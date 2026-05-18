import mongoose from 'mongoose';

const landmarkSchema = new mongoose.Schema({
  name: { type: String, required: true },
  popularity: { type: String, default: 'Tourist Popular' },
  images: [{ type: String }],
});

const locationMasterSchema = new mongoose.Schema({
  locationName: { type: String, required: true, trim: true },
  locationType: { type: String, enum: ['Country', 'State', 'City', 'Area'], required: true },
  parentLocation: { type: String },
  landmarks: [landmarkSchema],
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  aboutLocation: { type: String },
}, { timestamps: true });

export default mongoose.model('LocationMaster', locationMasterSchema);

import mongoose from 'mongoose';

const experienceMasterSchema = new mongoose.Schema({
  experienceName: { type: String, required: true, trim: true },
  representingIcon: { type: String, default: 'TreePine' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  themeCoverImageUrl: { type: String },
  description: { type: String },
  propertiesCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('ExperienceMaster', experienceMasterSchema);

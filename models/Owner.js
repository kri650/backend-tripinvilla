import mongoose from 'mongoose';

const ownerSchema = new mongoose.Schema({
  ownerNo: { type: String, required: true, unique: true },
  image: { type: String },
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  contactNo: { type: String, required: true },
  properties: [{ type: String }],
  numberOfProperties: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('Owner', ownerSchema);

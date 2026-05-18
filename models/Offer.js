import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true },
  dateFrom: { type: Date, required: true },
  dateTo: { type: Date, required: true },
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyName: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  room: { type: String, required: true },
  foods: { type: String },
  amenities: [{ type: String }],
  offerPercent: { type: Number, required: true },
  description: { type: String },
  status: { type: String, enum: ['Active', 'Expired'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);

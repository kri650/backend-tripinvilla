import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  offerId: { type: String, required: true, unique: true },
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  request_id: { type: mongoose.Schema.Types.ObjectId, ref: 'PropertyRequest' },
  
  // Compatibility fields
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyName: { type: String },
  location: { type: String },
  dateFrom: { type: Date },
  dateTo: { type: Date },
  room: { type: String },
  foods: { type: String },

  // New specific fields
  category: { type: String, required: true },
  room_type: { type: String, required: true },
  food_type: { type: String, required: true },
  amenities: [{ type: String }],
  price: { type: Number, required: true },
  offer_date: { type: Date, required: true },
  offer_time: { type: String, required: true },
  offer_percent: { type: String, required: true },
  description: { type: String },
  status: { type: String, enum: ['active', 'expired', 'Active', 'Expired'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Offer', offerSchema);

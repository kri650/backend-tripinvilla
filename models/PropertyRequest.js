import mongoose from 'mongoose';

const propertyRequestSchema = new mongoose.Schema({
  requestNo: { type: String },
  image: { type: String },
  propertyName: { type: String },
  location: { type: String },
  ownerName: { type: String },
  ownerContact: { type: String },
  priceByOwner: { type: Number },
  status: { type: String, enum: ['NotAccepted', 'Accepted', 'Rejected', 'pending', 'approved', 'rejected'], default: 'pending' },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  
  // New fields
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  category: { type: String },
  room_type: { type: String },
  bed_type: { type: String },
  amenities_types: [{ type: String }],
  price_per_room: { type: Number },
  checkin_time: { type: String },
  checkout_time: { type: String },
  offer_percent: { type: String },
  rules: { type: String },
  admin_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('PropertyRequest', propertyRequestSchema);

import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  propertyNo: { type: String },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Apartment', 'Villa', 'Resort', 'Homestay', 'Cottage', 'Hotel', 'Motel', 'Bungalow', 'Farmhouse', 'Others'], required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String },
  country: { type: String, default: 'India' },
  price: { type: Number, required: true },
  bedRooms: { type: Number, default: 1 },
  bathRooms: { type: Number, default: 1 },
  floors: { type: Number, default: 1 },
  capacity: { type: Number, default: 2 },
  images: [{ type: String }],
  amenities: [{ type: String }],
  description: { type: String },
  status: { type: String, enum: ['Active', 'Pending', 'Inactive', 'Inactive Admin'], default: 'Pending' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalBookings: { type: Number, default: 0 },
  hasActiveOffer: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

export default mongoose.model('Property', propertySchema);

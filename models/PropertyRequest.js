import mongoose from 'mongoose';

const roomEntrySchema = new mongoose.Schema({
  room_type: { type: String },
  room_image_url: { type: String },
  room_images: [{ type: String }],
  bed_type: { type: String },
  amenities_types: [{ type: String }],
  experiences: [{ type: String }],
  original_price: { type: Number },
  price_per_room: { type: Number },
  tax_amount: { type: Number },
  checkin_time: { type: String },
  checkout_time: { type: String },
  offers: [{ type: String }],
  rules: [{
    title: { type: String },
    points: [{ type: String }]
  }]
}, { _id: false });

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
  room_image_url: { type: String },
  room_images: [{ type: String }],
  bed_type: { type: String },
  amenities_types: [{ type: String }],
  price_per_room: { type: Number },
  original_price: { type: Number },
  tax_amount: { type: Number },
  checkin_time: { type: String },
  checkout_time: { type: String },
  offers: [{ type: String }],
  rules: [{
    title: { type: String },
    points: [{ type: String }]
  }],
  rooms: [roomEntrySchema],
  admin_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('PropertyRequest', propertyRequestSchema);

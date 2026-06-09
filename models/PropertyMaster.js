import mongoose from 'mongoose';

const propertyMasterSchema = new mongoose.Schema({
  propertyNo: { type: String, required: true, unique: true },
  propertyType: { type: String, required: true },
  propertyName: { type: String, required: true, trim: true },
  ownerName: { type: String, required: true, trim: true },
  ownerContact: { type: String, required: true },
  amenityTypes: [{ type: String }],
  location: { type: String, required: true },
  full_address: { type: String },
  countryId: { type: mongoose.Schema.Types.ObjectId },
  countryName: { type: String },
  stateId: { type: mongoose.Schema.Types.ObjectId },
  stateName: { type: String },
  cityId: { type: mongoose.Schema.Types.ObjectId },
  cityName: { type: String },
  locationId: { type: mongoose.Schema.Types.ObjectId },
  locationName: { type: String },
  propertyPrice: { type: Number, required: true },
  originalPrice: { type: Number },
  taxAmount: { type: Number },
  images: [{ type: String }],
  videos: [{ type: String }],
  aboutProperty: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  landmarks: [{
    landmark_name: { type: String },
    landmark_type: { type: String },
    landmark_image_url: { type: String }
  }],
  rooms: [{
    roomType: { type: String },
    roomName: { type: String },
    imageUrl: { type: String },
    pricePerNight: { type: Number },
    maxGuests: { type: Number },
    bedType: { type: String },
    count: { type: Number },
    amenities: [{ type: String }],
    checkIn: { type: String },
    checkOut: { type: String },
    offer: { type: String },
    rules: { type: String }
  }],
  otherDetails: [{ title: String, text: String }],
  foodPreference: { type: String, enum: ["veg", "non-veg", "both", "none"], default: "none" },
  roomType: { type: String },
}, { timestamps: true });

export default mongoose.model('PropertyMaster', propertyMasterSchema);

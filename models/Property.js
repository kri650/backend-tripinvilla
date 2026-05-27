import mongoose from 'mongoose';

const propertySchema = new mongoose.Schema({
  propertyNo: { type: String },
  name: { type: String, required: true, trim: true },
  type: { type: String, enum: ['Apartment', 'Villa', 'Resort', 'Homestay', 'Cottage', 'Hotel', 'Motel', 'Bungalow', 'Farmhouse', 'Others'], required: true },
  location: { type: String, required: true },
  full_address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
  city: { type: String, required: true },
  state: { type: String },
  country: { type: String, default: 'India' },
  price: { type: Number, required: true },
  price_per_night: { type: Number },
  bedRooms: { type: Number, default: 1 },
  roomType: { type: String, default: '1 Room' },
  ownerContact: { type: String },
  bathRooms: { type: Number, default: 1 },
  floors: { type: Number, default: 1 },
  capacity: { type: Number, default: 2 },
  images: [{ type: String }],
  amenities: [{ type: String }],
  description: { type: String },
  checkIn: { type: String, default: '3:00 PM' },
  checkOut: { type: String, default: '12:00 PM' },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Country' },
  countryName: { type: String },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'State' },
  stateName: { type: String },
  cityId: { type: mongoose.Schema.Types.ObjectId, ref: 'City' },
  cityName: { type: String },
  locationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Location' },
  locationName: { type: String },
  originalPrice: { type: Number },
  taxAmount: { type: Number },
  highlights: {
    breakfastIncluded: { type: Boolean, default: false },
    freeCancellation: { type: Boolean, default: false },
    freeCancellationHours: { type: String, default: '24' },
    parkingAvailable: { type: Boolean, default: false },
  },
  experiences: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ExperienceMaster' }],
  landmarks: [{
    landmark_name: { type: String },
    landmark_type: { type: String },
    landmark_image_url: { type: String }
  }],
  
  // --- Type-Specific Details ---
  // Villa specific
  privatePool: { type: Boolean, default: false },
  gardenArea: { type: Boolean, default: false },
  chefAvailable: { type: Boolean, default: false },
  entirePropertyOnly: { type: Boolean, default: false },
  securityCCTV: { type: Boolean, default: false },
  numberOfFloors: { type: String },
  plotSize: { type: String },
  
  // Resort/Hotel specific
  restaurantOnSite: { type: Boolean, default: false },
  spaWellness: { type: Boolean, default: false },
  conferenceRoom: { type: Boolean, default: false },
  roomService: { type: Boolean, default: false },
  receptionAllDay: { type: Boolean, default: false },
  liftElevator: { type: Boolean, default: false },
  starRating: { type: String },
  totalRooms: { type: String },
  totalFloors: { type: String },
  activities: [{ type: String }],
  // Rooms (for Hotel/Resort)
  rooms: [{
    roomType: { type: String },
    roomName: { type: String },
    pricePerNight: { type: Number },
    maxGuests: { type: Number },
    bedType: { type: String },
    count: { type: Number, default: 1 },
    amenities: [{ type: String }]
  }],
  
  // Apartment specific
  floorNumber: { type: String },
  totalFloorsBuilding: { type: String },
  furnishedStatus: { type: String, default: 'Fully Furnished' },
  washingMachine: { type: Boolean, default: false },
  societyAmenities: [{ type: String }],
  
  // Cottage specific
  bonfireArea: { type: Boolean, default: false },
  viewType: { type: String, default: 'Mountain' },
  outdoorSeating: { type: Boolean, default: false },
  nearestHikingTrail: { type: String },
  distanceFromCity: { type: String },
  // -----------------------------

  rules: { type: String, default: '• Primary Guest should be atleast 18 years of age.\n• Passport, Aadhaar, Driving License and Govt. ID are accepted as ID proof(s).' },
  area: { type: String, default: '31 sq. ft.' },
  beds: { type: Number, default: 2 },
  status: { type: String, enum: ['Active', 'Pending', 'Inactive', 'Inactive Admin'], default: 'Pending' },
  rating: { type: Number, default: 0, min: 0, max: 5 },
  totalBookings: { type: Number, default: 0 },
  hasActiveOffer: { type: Boolean, default: false },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // --- Priority (Set automatically by Subscription) ---
  priority: { type: Number, default: 0 },
  // --- Search Engine specific ---
  foodPreference: { type: String, enum: ["veg", "non-veg", "both", "none"], default: "none" },
  bookedDates: [{ checkIn: Date, checkOut: Date }],
  isVerified: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },

}, { timestamps: true });

// --- Index for fast sorted queries ---
propertySchema.index({ priority: -1, createdAt: -1 });
propertySchema.index({ city: 1, priority: -1 });
propertySchema.index({ type: 1, priority: -1 });

// --- Text index for keyword / AI search ---
propertySchema.index(
  { name: "text", description: "text", city: "text", state: "text" },
  { weights: { name: 10, city: 8, description: 3 } }
);

export default mongoose.model('Property', propertySchema);

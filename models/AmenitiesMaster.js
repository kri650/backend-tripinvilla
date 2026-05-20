import mongoose from 'mongoose';

const amenitiesMasterSchema = new mongoose.Schema({
  amenitiesName: { type: String, required: true, trim: true },
  amenitiesCategory: {
    type: String,
    required: true,
    enum: ['Basic', 'Kitchen', 'Outdoor', 'Safety', 'Luxury', 'View', 'Fine & Dining', 'Recreation', 'Wellness', 'Business'],
    default: 'Basic',
    trim: true
  },
  availabilityScope: {
    type: String,
    required: true,
    enum: ['All', 'Villa', 'Hotel', 'Homestay', 'Resort'],
    default: 'All'
  },
  icon: { type: String, default: 'Wifi' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('AmenitiesMaster', amenitiesMasterSchema);

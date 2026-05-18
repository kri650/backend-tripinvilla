import mongoose from 'mongoose';

const amenitiesMasterSchema = new mongoose.Schema({
  amenitiesName: { type: String, required: true, trim: true },
  amenitiesCategory: { type: String, required: true, trim: true },
  availabilityScope: { type: String, required: true, default: 'All' },
  checkIn: { type: String, default: '9:00 AM' },
  checkOut: { type: String, default: '12:00 PM' },
  offer: { type: String, default: 'None' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('AmenitiesMaster', amenitiesMasterSchema);

import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  user_name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String, required: true },
  query: { type: String, required: true },

  // Compatibility fields
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  name: { type: String },
  message: { type: String },
  propertyName: { type: String },
  status: { type: String, enum: ['Open', 'Replied', 'Closed'], default: 'Open' },
  reply: { type: String },
  repliedAt: { type: Date }
}, { timestamps: true });

export default mongoose.model('Enquiry', enquirySchema);

import mongoose from 'mongoose';

const enquirySchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  property: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
  propertyName: { type: String },
  message: { type: String, required: true },
  status: { type: String, enum: ['Open', 'Replied', 'Closed'], default: 'Open' },
  reply: { type: String },
  repliedAt: { type: Date },
}, { timestamps: true });

export default mongoose.model('Enquiry', enquirySchema);

import mongoose from 'mongoose';

const propertyRequestSchema = new mongoose.Schema({
  requestNo: { type: String, required: true },
  image: { type: String },
  propertyName: { type: String, required: true },
  location: { type: String, required: true },
  category: { type: String, required: true },
  ownerName: { type: String, required: true },
  ownerContact: { type: String, required: true },
  priceByOwner: { type: Number, required: true },
  status: { type: String, enum: ['NotAccepted', 'Accepted', 'Rejected'], default: 'NotAccepted' },
}, { timestamps: true });

export default mongoose.model('PropertyRequest', propertyRequestSchema);

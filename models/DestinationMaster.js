import mongoose from 'mongoose';

const destinationMasterSchema = new mongoose.Schema({
  destinationName: { type: String, required: true, trim: true },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'StateMaster' },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CountryMaster' },
  coverImageUrl: { type: String },
  propertyTypesOffered: [{ type: String }],
  description: { type: String },
  propertiesCount: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('DestinationMaster', destinationMasterSchema);

import mongoose from 'mongoose';

const cityMasterSchema = new mongoose.Schema({
  cityName: { type: String, required: true, trim: true },
  stateId: { type: mongoose.Schema.Types.ObjectId, ref: 'StateMaster' },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CountryMaster' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  propertiesCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('CityMaster', cityMasterSchema);

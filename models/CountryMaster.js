import mongoose from 'mongoose';

const countryMasterSchema = new mongoose.Schema({
  countryName: { type: String, required: true, unique: true, trim: true },
  dialCode: { type: String, required: true },
  currencyCode: { type: String, required: true },
  currencySymbol: { type: String, required: true },
  flagImageUrl: { type: String },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
}, { timestamps: true });

export default mongoose.model('CountryMaster', countryMasterSchema);

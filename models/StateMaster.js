import mongoose from 'mongoose';

const stateMasterSchema = new mongoose.Schema({
  stateName: { type: String, required: true, unique: true, trim: true },
  countryId: { type: mongoose.Schema.Types.ObjectId, ref: 'CountryMaster' },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  citiesCount: { type: Number, default: 0 },
  ownersCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('StateMaster', stateMasterSchema);

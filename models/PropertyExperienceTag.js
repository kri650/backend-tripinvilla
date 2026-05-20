import mongoose from 'mongoose';

const propertyExperienceTagSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  experienceId: { type: mongoose.Schema.Types.ObjectId, ref: 'ExperienceMaster', required: true },
}, { timestamps: true });

export default mongoose.model('PropertyExperienceTag', propertyExperienceTagSchema);

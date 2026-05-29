import mongoose from 'mongoose';

const supportVideoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true
  },
  videoUrl: {
    type: String,
    required: true
  }
}, { timestamps: true });

export default mongoose.model('SupportVideo', supportVideoSchema);

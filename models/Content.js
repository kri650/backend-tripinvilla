import mongoose from 'mongoose';

const ContentSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { timestamps: true });

const Content = mongoose.model('Content', ContentSchema);

export default Content;

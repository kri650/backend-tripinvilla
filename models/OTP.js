import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  phone: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true 
  },
  otp: { 
    type: String, 
    required: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String,
    lowercase: true,
    trim: true 
  },
  propertyName: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now, 
    expires: 300 // TTL Index: MongoDB automatically deletes this record after 5 minutes (300 seconds)
  }
}, { timestamps: true });

export default mongoose.model('OTP', otpSchema);

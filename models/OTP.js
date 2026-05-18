import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
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
  phone: { 
    type: String, 
    required: true 
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

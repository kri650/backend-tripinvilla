import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['super_admin', 'admin', 'moderator', 'owner', 'user'], default: 'user' },
  avatar: { type: String },
  phone: { type: String },
  company: { type: String },
  pan: { type: String },
  bank: { type: String },
  accountNum: { type: String },
  ifsc: { type: String },
  address: { type: String },
  city: { type: String },
  state: { type: String },
  pincode: { type: String },
  citizenship: { type: String },
  residence: { type: String },
  emergencyName: { type: String },
  emergencyPhone: { type: String },
  emergencyEmail: { type: String },
  isBlacklisted: { type: Boolean, default: false },
  isPremium: { type: Boolean, default: false },
  lastLogin: { type: Date },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model('User', userSchema);

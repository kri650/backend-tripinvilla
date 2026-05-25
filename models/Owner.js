import mongoose from 'mongoose';

const ownerSchema = new mongoose.Schema({
  ownerNo: { type: String, required: true, unique: true },
  image: { type: String },
  ownerName: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  contactNo: { type: String, required: true },
  properties: [{ type: String }],
  numberOfProperties: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  // --- Subscription ---
  subscription: {
    isActive: { type: Boolean, default: false },
    plan: { type: String, default: null }, // "monthly" | "yearly" | null
    expiresAt: { type: Date, default: null },
    razorpayOrderId: { type: String, default: null },
    razorpayPaymentId: { type: String, default: null },
    razorpaySignature: { type: String, default: null },
    history: [
      {
        razorpayPaymentId: String,
        plan: String,
        amount: Number, // in paise
        paidAt: { type: Date, default: Date.now },
        expiresAt: Date,
      },
    ],
  },
}, { timestamps: true });

// Virtual: is subscription currently valid?
ownerSchema.virtual("isSubscribed").get(function () {
  return (
    this.subscription?.isActive &&
    this.subscription?.expiresAt &&
    new Date() < new Date(this.subscription.expiresAt)
  );
});

ownerSchema.set("toJSON", { virtuals: true });
ownerSchema.set("toObject", { virtuals: true });

export default mongoose.model('Owner', ownerSchema);

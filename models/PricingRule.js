import mongoose from 'mongoose';

const pricingRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, default: 'Homestay' },
  roomType: { type: String, default: 'Deluxe Room 1, Semi Deluxe 2' },
  bedType: { type: String, default: 'King Size 1' },
  amenities: { type: String, default: 'Barbeque, Pub & 2 others' },
  price: { type: String, default: '₹1,233 per night' },
  rules: { type: String, default: 'Must Read Rules\n• Primary Guest should be atleast 18 years of age.' },
  checkIn: { type: String, default: '9:00 AM' },
  checkOut: { type: String, default: '12:00 PM' },
  offer: { type: String, default: '20% Off' },
  status: { type: String, default: 'Active' },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model('PricingRule', pricingRuleSchema);

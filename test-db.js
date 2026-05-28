import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: 'admin@tripinvilla.com' });
  console.log('OTP:', user?.resetOtp);
  process.exit();
}
test();

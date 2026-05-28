import mongoose from 'mongoose';
import Property from './models/Property.js';
import dotenv from 'dotenv';
dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const p = await Property.findOne({ name: 'new property2' });
  console.log('Rooms in Property:', p?.rooms);
  process.exit();
}
test();

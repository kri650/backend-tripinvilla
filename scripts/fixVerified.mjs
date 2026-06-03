import mongoose from 'mongoose';
import Property from '../models/Property.js';

await mongoose.connect('mongodb://tripuser:trip123@13.127.196.228:27017/tripinvilla');

const result = await Property.updateMany(
  { status: 'Active' },
  { $set: { isVerified: true, isFeatured: true } }
);

console.log(`Updated ${result.modifiedCount} properties → isVerified: true, isFeatured: true`);
await mongoose.disconnect();
process.exit(0);

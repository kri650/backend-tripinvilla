import mongoose from 'mongoose';
import LocationMaster from './models/LocationMaster.js';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const locs = await LocationMaster.find({ locationName: /delhi/i });
console.log(JSON.stringify(locs, null, 2));
process.exit(0);

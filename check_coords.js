import mongoose from 'mongoose';
import Property from './models/Property.js';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const props = await Property.find({}, 'name latitude longitude');
console.log(props.slice(0, 5));
console.log("Total props with coords:", props.filter(p => p.latitude && p.longitude).length);
console.log("Total props:", props.length);
process.exit(0);

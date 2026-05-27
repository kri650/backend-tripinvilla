import mongoose from 'mongoose';
import PropertyMaster from './models/PropertyMaster.js';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const props = await PropertyMaster.find({ city: /delhi/i });
console.log("Delhi properties:", props.length);
props.forEach(p => console.log(p.location, p.city, p.state));
process.exit(0);

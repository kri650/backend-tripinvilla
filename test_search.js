import mongoose from 'mongoose';
import Property from './models/Property.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

await mongoose.connect(process.env.MONGO_URI);
const kw = "homestay goa";
const terms = kw.split(/\s+/).filter(t => t.length > 1);
const filter = { status: 'Active' };
filter.$and = [];
terms.forEach(term => {
  filter.$and.push({
    $or: [
      { name: new RegExp(term, "i") },
      { city: new RegExp(term, "i") },
      { state: new RegExp(term, "i") },
      { location: new RegExp(term, "i") },
      { type: new RegExp(term, "i") },
      { category: new RegExp(term, "i") },
      { description: new RegExp(term, "i") }
    ]
  });
});
console.log(JSON.stringify(filter, null, 2));
const results = await Property.find(filter);
console.log("Found:", results.length);
process.exit(0);

import mongoose from 'mongoose';
import LocationMaster from './models/LocationMaster.js';
import dotenv from 'dotenv';
dotenv.config();

await mongoose.connect(process.env.MONGO_URI);
const locs = await LocationMaster.find({});
for (let loc of locs) {
  let changed = false;
  for (let lm of loc.landmarks) {
    if (lm.images && lm.images.length > 0) {
      if (lm.images[0].startsWith('/uploads/http')) {
        lm.images[0] = lm.images[0].replace('/uploads/', '');
        changed = true;
      }
    }
  }
  if (changed) {
    await loc.save();
    console.log(`Fixed location ${loc.locationName}`);
  }
}
console.log('Done');
process.exit(0);

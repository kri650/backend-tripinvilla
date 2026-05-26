import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 })
  .then(async () => {
    console.log('Connected to DB');
    const Property = (await import('./models/Property.js')).default;
    const count = await Property.countDocuments();
    const props = await Property.find({}, 'name status').limit(5);
    console.log(`Total properties: ${count}`);
    console.log('Sample:', props);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

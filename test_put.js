import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripinvilla', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const prop = await db.collection('properties').findOne({ name: /New Property/i });
    if (!prop) return console.log("Not found");
    
    // Simulate what the route does
    const Property = mongoose.model('Property', new mongoose.Schema({}, { strict: false }));
    const doc = await Property.findById(prop._id);
    
    const body = { foodPreference: 'veg' };
    Object.assign(doc, body);
    await doc.save();
    console.log("Updated foodPreference");
    mongoose.connection.close();
  });

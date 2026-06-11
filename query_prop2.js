import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripinvilla', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const props = await db.collection('properties').find({ name: /maharashtra/i }).toArray();
    console.log(JSON.stringify(props.map(p => ({ name: p.name, foodPreference: p.foodPreference, _id: p._id })), null, 2));
    mongoose.connection.close();
  });

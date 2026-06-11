import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripinvilla', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const prop = await db.collection('properties').findOne({ name: /New Property/i });
    console.log(prop._id.toString());
    mongoose.connection.close();
  });

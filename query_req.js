import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tripinvilla', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const db = mongoose.connection.db;
    const props = await db.collection('propertyrequests').find({ propertyName: /New Property/i }).toArray();
    console.log(JSON.stringify(props.map(p => ({ propertyName: p.propertyName, foodPreference: p.foodPreference, food_type: p.food_type })), null, 2));
    mongoose.connection.close();
  });

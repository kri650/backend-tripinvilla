import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dbUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tripinvilla";

mongoose.connect(dbUri)
  .then(async () => {
    try {
      const PropertyRequest = (await import('./models/PropertyRequest.js')).default;
      const latestRequest = await PropertyRequest.findOne().sort({createdAt: -1});
      
      const payload = {
        rooms: [{
          room_type: "suit",
          original_price: 4500,
          tax_amount: 500,
          price_per_room: 3200
        }]
      };
      
      Object.assign(latestRequest, payload);
      await latestRequest.save();
      
      const check = await PropertyRequest.findById(latestRequest._id).lean();
      console.log("Rooms saved:", check.rooms);
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

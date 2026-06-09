import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const dbUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tripinvilla";

mongoose.connect(dbUri)
  .then(async () => {
    try {
      const db = mongoose.connection.db;
      const latestRequest = await db.collection('propertyrequests').find().sort({createdAt: -1}).limit(1).toArray();
      if (latestRequest.length > 0) {
        console.log("Latest Request ID:", latestRequest[0]._id);
        console.log("Rooms:", JSON.stringify(latestRequest[0].rooms, null, 2));
      } else {
        console.log("No requests found");
      }
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  });

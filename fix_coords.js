import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const uri = process.env.MONGO_URI || "mongodb://tripuser:trip123@13.127.196.228:27017/tripinvilla?authSource=tripinvilla";

async function fix() {
  await mongoose.connect(uri);
  const Property = mongoose.model("Property", new mongoose.Schema({}, { strict: false }));
  const props = await Property.find({ $or: [{ latitude: { $exists: false } }, { latitude: null }] });
  
  for (let p of props) {
    p.set('latitude', 20.5937 + (Math.random() * 5));
    p.set('longitude', 78.9629 + (Math.random() * 5));
    await p.save();
    console.log(`Updated to ${p.get('latitude')}, ${p.get('longitude')}`);
  }
  console.log("Done updating coordinates!");
  process.exit(0);
}
fix();

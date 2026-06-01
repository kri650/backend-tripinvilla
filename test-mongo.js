import mongoose from "mongoose";
import dotenv from "dotenv";
import Property from "./models/Property.js";

dotenv.config();

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const docs = await Property.find({
    status: "Active",
    $and: [
      {
        $or: [
          { name: /sirmaur/i },
          { city: /sirmaur/i },
          { state: /sirmaur/i },
          { location: /sirmaur/i },
          { type: /sirmaur/i },
          { category: /sirmaur/i },
          { description: /sirmaur/i }
        ]
      }
    ]
  });
  console.log(docs.map(d => ({ name: d.name, full_address: d.full_address })));
  process.exit(0);
}
run();

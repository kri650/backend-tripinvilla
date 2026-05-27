import mongoose from 'mongoose';
import User from './models/User.js';
import Property from './models/Property.js';

async function test() {
  await mongoose.connect('mongodb://127.0.0.1:27017/tripinvilla_db', { useNewUrlParser: true, useUnifiedTopology: true });
  
  // Create a fake user
  let user = await User.create({
    name: 'Test Premium User',
    email: 'testpremium@example.com',
    password: 'password123',
    isPremium: true
  });

  // Create a property for this user
  let prop1 = await Property.create({
    name: 'Premium Villa',
    type: 'Villa',
    location: 'Goa',
    city: 'Goa',
    price: 5000,
    owner: user._id,
    priority: 1
  });

  let prop2 = await Property.create({
    name: 'Normal Villa',
    type: 'Villa',
    location: 'Goa',
    city: 'Goa',
    price: 4000,
    priority: 0
  });

  // Fetch properties
  const props = await Property.find({}).sort({ priority: -1, createdAt: -1 }).limit(5);
  console.log("Top Properties:");
  props.forEach(p => console.log(`- ${p.name} (Priority: ${p.priority})`));

  // Cleanup
  await User.deleteOne({ _id: user._id });
  await Property.deleteMany({ _id: { $in: [prop1._id, prop2._id] } });
  mongoose.connection.close();
}

test().catch(console.error);

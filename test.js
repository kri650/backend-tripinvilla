import mongoose from 'mongoose';
import PropertyRequest from './models/PropertyRequest.js';

mongoose.connect('mongodb+srv://kritikathakur24_db_user:kritika123@kritika.jmr1rsb.mongodb.net/ngskillforge').then(async () => {
  const reqs = await PropertyRequest.find({ room_type: /semi/i });
  console.log(JSON.stringify(reqs, null, 2));
  process.exit();
});

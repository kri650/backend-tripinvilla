import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const contentSchema = new mongoose.Schema({}, { strict: false });
    const Content = mongoose.model('Content', contentSchema, 'contents');

    const allContent = await Content.find({});
    let found = false;
    allContent.forEach(doc => {
      const docStr = JSON.stringify(doc);
      if (docStr.includes('Villass') || docStr.includes('villass')) {
        console.log(`Found Villass in document with key: ${doc.key}`);
        console.log(docStr);
        found = true;
      }
    });
    if (!found) console.log('Villass not found in any Content document.');
    mongoose.disconnect();
  })
  .catch(err => console.error(err));

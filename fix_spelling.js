import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    const contentSchema = new mongoose.Schema({
      key: String,
      data: Object
    }, { strict: false });
    const Content = mongoose.model('Content', contentSchema, 'contents');

    const homeContent = await Content.findOne({ key: 'homepage' });
    if (homeContent) {
      console.log('Found homepage content:', JSON.stringify(homeContent.data.section1));
      if (homeContent.data && homeContent.data.section1 && homeContent.data.section1.title) {
        if (homeContent.data.section1.title.includes('Villass')) {
          homeContent.data.section1.title = homeContent.data.section1.title.replace(/Villass/g, 'Villas');
          homeContent.markModified('data');
          await homeContent.save();
          console.log('Fixed spelling in database!');
        } else {
          console.log('Villass not found in title:', homeContent.data.section1.title);
        }
      }
    } else {
      console.log('Homepage content not found.');
    }
    mongoose.disconnect();
  })
  .catch(err => console.error(err));

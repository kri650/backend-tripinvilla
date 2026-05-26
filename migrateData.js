import { MongoClient } from 'mongodb';

const oldUri = "mongodb+srv://kritikathakur24_db_user:kritika123@kritika.jmr1rsb.mongodb.net/ngskillforge";
const newUri = "mongodb://tripadmin:StrongPassword123@13.127.196.228:27017/tripinvilla?authSource=admin";

async function migrate() {
  const oldClient = new MongoClient(oldUri);
  const newClient = new MongoClient(newUri);

  try {
    console.log("Connecting to old DB...");
    await oldClient.connect();
    const oldDb = oldClient.db();

    console.log("Connecting to new DB...");
    await newClient.connect();
    const newDb = newClient.db();

    const collections = await oldDb.listCollections().toArray();
    console.log(`Found ${collections.length} collections.`);

    for (const collInfo of collections) {
      const collName = collInfo.name;
      console.log(`Migrating collection: ${collName}...`);
      
      const oldColl = oldDb.collection(collName);
      const newColl = newDb.collection(collName);

      const docs = await oldColl.find({}).toArray();
      console.log(`  - Found ${docs.length} documents.`);

      if (docs.length > 0) {
        // Clear new collection first
        await newColl.deleteMany({});
        // Insert docs
        await newColl.insertMany(docs);
        console.log(`  - Inserted ${docs.length} documents into new DB.`);
      }
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await oldClient.close();
    await newClient.close();
  }
}

migrate();

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

const MONGODB_URI = process.env.MONGODB_URI;
const teachersFilePath = path.join(__dirname, '..', 'public', 'teachers.json');

async function migrateTeachers() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db('eduapp');
    const teachersCollection = db.collection('teachers');

    // Read existing teachers from JSON file
    const teachersData = JSON.parse(fs.readFileSync(teachersFilePath, 'utf8'));

    // Clear existing data (optional, for clean migration)
    // await teachersCollection.deleteMany({});

    // Insert teachers into MongoDB
    const teachersToInsert = teachersData.map(teacher => ({
      username: teacher.username,
      password: teacher.password,
      name: teacher.name || '',
      createdAt: new Date()
    }));

    // Bulk insert for better performance (O(n) time vs O(n) individual inserts)
    try {
      const result = await teachersCollection.insertMany(teachersToInsert, { ordered: false });
      console.log(`Migrated ${result.insertedCount} teachers to MongoDB Atlas`);
    } catch (error) {
      console.error('Bulk insert failed:', error.message);
      // Fallback to individual inserts if bulk fails
      let insertedCount = 0;
      for (const teacher of teachersToInsert) {
        try {
          await teachersCollection.insertOne(teacher);
          insertedCount++;
        } catch (err) {
          console.error(`Failed to insert teacher ${teacher.username}:`, err.message);
        }
      }
      console.log(`Fallback: Migrated ${insertedCount} teachers to MongoDB Atlas`);
    }

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.close();
  }
}

migrateTeachers();

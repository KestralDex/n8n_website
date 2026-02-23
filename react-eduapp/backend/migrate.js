require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = 'eduapp';

async function migrate() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(DB_NAME);

    console.log('Connected to MongoDB Atlas\n');

    const yearsCollection = db.collection('years');
    const studentsCollection = db.collection('students');
    const teachersCollection = db.collection('teachers');

    // Check if data already exists
    const yearsCount = await yearsCollection.countDocuments();
    if (yearsCount > 0) {
      console.log('Data already exists in years collection.');
      
      // Still ensure demo teacher exists
      const teacherExists = await teachersCollection.findOne({ username: 'teacher' });
      if (!teacherExists) {
        const hashedPassword = await bcrypt.hash('teacher123', 10);
        await teachersCollection.insertOne({
          username: 'teacher',
          password: hashedPassword,
          name: 'Demo Teacher',
          createdAt: new Date()
        });
        console.log('✓ Inserted demo teacher account');
      } else {
        console.log('✓ Demo teacher already exists');
      }
      
      console.log('\n=== Migration Complete ===');
      return;
    }

    console.log('Seeding initial data...\n');

    // 1. Create sample years
    const yearsResult = await yearsCollection.insertMany([
      { name: '2023-2024', createdAt: new Date() },
      { name: '2024-2025', createdAt: new Date() },
      { name: '2025-2026', createdAt: new Date() }
    ]);
    console.log(`✓ Inserted ${yearsResult.insertedCount} years`);

    // Get year IDs
    const years = await yearsCollection.find().toArray();
    const year2024 = years.find(y => y.name === '2024-2025');
    const year2025 = years.find(y => y.name === '2025-2026');

    // 2. Create sample students for 2024-2025
    if (year2024) {
      const students2024 = [
        { name: 'Alice Johnson', student_id: 'STU001', year_id: year2024._id, createdAt: new Date() },
        { name: 'Bob Smith', student_id: 'STU002', year_id: year2024._id, createdAt: new Date() },
        { name: 'Charlie Brown', student_id: 'STU003', year_id: year2024._id, createdAt: new Date() },
        { name: 'Diana Prince', student_id: 'STU004', year_id: year2024._id, createdAt: new Date() },
        { name: 'Ethan Hunt', student_id: 'STU005', year_id: year2024._id, createdAt: new Date() },
        { name: 'Fiona Carter', student_id: 'STU006', year_id: year2024._id, createdAt: new Date() },
        { name: 'George Miller', student_id: 'STU007', year_id: year2024._id, createdAt: new Date() },
        { name: 'Hannah Davis', student_id: 'STU008', year_id: year2024._id, createdAt: new Date() },
        { name: 'Ian Wilson', student_id: 'STU009', year_id: year2024._id, createdAt: new Date() },
        { name: 'Julia Roberts', student_id: 'STU010', year_id: year2024._id, createdAt: new Date() }
      ];
      const studentsResult = await studentsCollection.insertMany(students2024);
      console.log(`✓ Inserted ${studentsResult.insertedCount} students for 2024-2025`);
    }

    // 3. Create sample students for 2025-2026
    if (year2025) {
      const students2025 = [
        { name: 'Kevin Thomas', student_id: 'STU101', year_id: year2025._id, createdAt: new Date() },
        { name: 'Laura Garcia', student_id: 'STU102', year_id: year2025._id, createdAt: new Date() },
        { name: 'Michael Lee', student_id: 'STU103', year_id: year2025._id, createdAt: new Date() },
        { name: 'Nancy White', student_id: 'STU104', year_id: year2025._id, createdAt: new Date() },
        { name: 'Oliver Martinez', student_id: 'STU105', year_id: year2025._id, createdAt: new Date() }
      ];
      const studentsResult = await studentsCollection.insertMany(students2025);
      console.log(`✓ Inserted ${studentsResult.insertedCount} students for 2025-2026`);
    }

    // 4. Create a demo teacher account
    const hashedPassword = await bcrypt.hash('teacher123', 10);
    await teachersCollection.insertOne({
      username: 'teacher',
      password: hashedPassword,
      name: 'Demo Teacher',
      createdAt: new Date()
    });
    console.log('✓ Inserted demo teacher account');

    console.log('\n=== Migration Complete ===\n');
    console.log('Demo login: username: teacher, password: teacher123');

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    await client.close();
  }
}

migrate();

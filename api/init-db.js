require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

let pool;
let initialized = false;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function initDatabase() {
  if (initialized) return;
  
  const db = getPool();
  
  try {
    console.log('Initializing database tables...');
    
    // Create years table
    await db.query(
      "CREATE TABLE IF NOT EXISTS years (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log('✓ Years table ready');
    
    // Create students table
    await db.query(
      "CREATE TABLE IF NOT EXISTS students (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, student_id VARCHAR(255) UNIQUE NOT NULL, year_id INTEGER REFERENCES years(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log('✓ Students table ready');
    
    // Create subjects table
    await db.query(
      "CREATE TABLE IF NOT EXISTS subjects (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL, teacher_id INTEGER REFERENCES teachers(id), year_id INTEGER REFERENCES years(id), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log('✓ Subjects table ready');
    
    // Create attendance table
    await db.query(
      "CREATE TABLE IF NOT EXISTS attendance (id SERIAL PRIMARY KEY, subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE, student_id VARCHAR(255) NOT NULL, status VARCHAR(50) DEFAULT 'Present', timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP, UNIQUE(subject_id, student_id))"
    );
    console.log('✓ Attendance table ready');
    
    // Seed sample data if tables are empty
    await seedSampleData(db);
    
    initialized = true;
    console.log('✓ Database initialization complete');
    
  } catch (error) {
    console.error('Error initializing database:', error.message);
    throw error;
  }
}

async function seedSampleData(db) {
  try {
    // Check if years already exist
    const yearsResult = await db.query('SELECT COUNT(*) as count FROM years');
    const yearsCount = parseInt(yearsResult.rows[0].count);
    
    if (yearsCount === 0) {
      console.log('Seeding sample years...');
      
      // Insert default years
      const defaultYears = ['FE', 'SE', 'TE', 'BE'];
      for (const yearName of defaultYears) {
        await db.query('INSERT INTO years (name) VALUES ($1)', [yearName]);
      }
      console.log('✓ Inserted ' + defaultYears.length + ' sample years');
      
      // Get year IDs
      const years = await db.query('SELECT id, name FROM years');
      const yearMap = new Map(years.rows.map(function(y) { return [y.name, y.id]; }));
      
      // Seed sample students for each year
      var sampleStudents = [
        { name: 'Alice Johnson', student_id: 'STU001', year: 'FE' },
        { name: 'Bob Smith', student_id: 'STU002', year: 'FE' },
        { name: 'Charlie Brown', student_id: 'STU003', year: 'FE' },
        { name: 'Diana Prince', student_id: 'STU004', year: 'SE' },
        { name: 'Ethan Hunt', student_id: 'STU005', year: 'SE' },
        { name: 'Fiona Carter', student_id: 'STU006', year: 'SE' },
        { name: 'George Miller', student_id: 'STU007', year: 'TE' },
        { name: 'Hannah Davis', student_id: 'STU008', year: 'TE' },
        { name: 'Ian Wilson', student_id: 'STU009', year: 'BE' },
        { name: 'Julia Roberts', student_id: 'STU010', year: 'BE' }
      ];
      
      for (var i = 0; i < sampleStudents.length; i++) {
        var student = sampleStudents[i];
        var yearId = yearMap.get(student.year);
        if (yearId) {
          await db.query(
            'INSERT INTO students (name, student_id, year_id) VALUES ($1, $2, $3)',
            [student.name, student.student_id, yearId]
          );
        }
      }
      console.log('✓ Inserted ' + sampleStudents.length + ' sample students');
      
    } else {
      console.log('✓ Database already has data, skipping seed');
    }
  } catch (error) {
    console.error('Error seeding data:', error.message);
  }
}

module.exports = {
  initDatabase: initDatabase,
  getPool: getPool
};

require('dotenv').config();
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

async function seed() {
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to PostgreSQL database...');
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Connected to PostgreSQL at:', result.rows[0].now);
    client.release();

    console.log('\n=== Starting Seed Process ===\n');

    // Check if years already exist
    const existingYears = await pool.query('SELECT * FROM years');
    if (existingYears.rows.length > 0) {
      console.log('Years already exist in database. Current years:');
      existingYears.rows.forEach(year => {
        console.log(`  - ${year.name} (ID: ${year.id})`);
      });
      
      // Check if we should proceed
      console.log('\nYears already seeded. Skipping year creation.');
    } else {
      console.log('Creating years...');
      
      // Create FE, SE, TE, BE years
      const years = [
        { name: 'FE', displayName: 'First Engineering (FE)' },
        { name: 'SE', displayName: 'Second Engineering (SE)' },
        { name: 'TE', displayName: 'Third Engineering (TE)' },
        { name: 'BE', displayName: 'Fourth Engineering (BE)' }
      ];

      for (const year of years) {
        const result = await pool.query(
          'INSERT INTO years (name) VALUES ($1) RETURNING id, name',
          [year.name]
        );
        console.log(`✓ Created year: ${year.displayName} (ID: ${result.rows[0].id})`);
      }
    }

    // Get all years
    const allYears = await pool.query('SELECT * FROM years ORDER BY id');
    console.log('\nAvailable years:');
    allYears.rows.forEach(year => {
      console.log(`  - ${year.name} (ID: ${year.id})`);
    });

    // Check existing students
    const existingStudents = await pool.query('SELECT COUNT(*) FROM students');
    console.log(`\nCurrent student count: ${existingStudents.rows[0].count}`);

    if (parseInt(existingStudents.rows[0].count) > 0) {
      console.log('Students already exist. Skipping student creation.');
    } else {
      console.log('\nCreating sample students for each year...');

      // Sample students data for each year
      const studentsData = {
        'FE': [
          { name: 'Amit Sharma', student_id: 'FE001' },
          { name: 'Priya Patel', student_id: 'FE002' },
          { name: 'Rahul Kumar', student_id: 'FE003' },
          { name: 'Sneha Gupta', student_id: 'FE004' },
          { name: 'Vikram Singh', student_id: 'FE005' },
          { name: 'Anjali Reddy', student_id: 'FE006' },
          { name: 'Deepak Joshi', student_id: 'FE007' },
          { name: 'Kavita Nair', student_id: 'FE008' },
          { name: 'Raj Malhotra', student_id: 'FE009' },
          { name: 'Meera Shah', student_id: 'FE010' }
        ],
        'SE': [
          { name: 'Arjun Verma', student_id: 'SE001' },
          { name: 'Pooja Khanna', student_id: 'SE002' },
          { name: 'Sanjay Gupta', student_id: 'SE003' },
          { name: 'Anita Desai', student_id: 'SE004' },
          { name: 'Nikhil Rao', student_id: 'SE005' },
          { name: 'Divya Iyer', student_id: 'SE006' },
          { name: 'Karan Bhatia', student_id: 'SE007' },
          { name: 'Swati Mishra', student_id: 'SE008' },
          { name: 'Aditya Chopra', student_id: 'SE009' },
          { name: 'Riya Kapoor', student_id: 'SE010' }
        ],
        'TE': [
          { name: 'Rohit Sharma', student_id: 'TE001' },
          { name: 'Neha Singh', student_id: 'TE002' },
          { name: 'Manish Patel', student_id: 'TE003' },
          { name: 'Lakshmi Menon', student_id: 'TE004' },
          { name: 'Suresh Kumar', student_id: 'TE005' },
          { name: 'Padma Venkatesh', student_id: 'TE006' },
          { name: 'Gopal Krishna', student_id: 'TE007' },
          { name: 'Uma Mahesh', student_id: 'TE008' },
          { name: 'Harish Chandra', student_id: 'TE009' },
          { name: 'Anusha Das', student_id: 'TE010' }
        ],
        'BE': [
          { name: 'Prateek Aggarwal', student_id: 'BE001' },
          { name: 'Shweta Rastogi', student_id: 'BE002' },
          { name: 'Ajay Sahoo', student_id: 'BE003' },
          { name: 'Richa Sinha', student_id: 'BE004' },
          { name: 'Vivek Pandey', student_id: 'BE005' },
          { name: 'Shruti Sharma', student_id: 'BE006' },
          { name: 'Abhishek Roy', student_id: 'BE007' },
          { name: 'Nisha Choudhary', student_id: 'BE008' },
          { name: 'Siddharth Jain', student_id: 'BE009' },
          { name: 'Pallavi Tripathi', student_id: 'BE010' }
        ]
      };

      let totalStudentsAdded = 0;

      // Insert students for each year
      for (const year of allYears.rows) {
        const students = studentsData[year.name];
        if (students) {
          console.log(`\nAdding students for ${year.name} (Year ID: ${year.id})...`);
          
          for (const student of students) {
            await pool.query(
              'INSERT INTO students (name, student_id, year_id) VALUES ($1, $2, $3)',
              [student.name, student.student_id, year.id]
            );
            console.log(`  ✓ Added: ${student.name} (${student.student_id})`);
            totalStudentsAdded++;
          }
        }
      }

      console.log(`\n✓ Total students added: ${totalStudentsAdded}`);
    }

    // Display final summary
    console.log('\n=== Final Summary ===');
    
    const finalYears = await pool.query('SELECT * FROM years ORDER BY id');
    console.log('\nYears in database:');
    finalYears.rows.forEach(year => {
      console.log(`  - ${year.name} (ID: ${year.id})`);
    });

    const finalStudents = await pool.query(`
      SELECT s.*, y.name as year_name 
      FROM students s 
      JOIN years y ON s.year_id = y.id 
      ORDER BY y.id, s.student_id
    `);
    
    console.log('\nAll Students in database:');
    console.log('-----------------------');
    finalStudents.rows.forEach(student => {
      console.log(`  ${student.student_id} - ${student.name} (${student.year_name})`);
    });
    
    console.log(`\nTotal students: ${finalStudents.rows.length}`);

    console.log('\n=== Seed Complete ===\n');
    
    await pool.end();
    
  } catch (error) {
    console.error('Seed error:', error.message);
    await pool.end();
    process.exit(1);
  }
}

seed();

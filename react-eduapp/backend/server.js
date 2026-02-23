require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(bodyParser.json());

// PostgreSQL connection pool
let pool;
let dbConnected = false;

async function connectToDatabase() {
  try {
    console.log('Connecting to PostgreSQL database...');
    
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Test connection
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Connected to PostgreSQL at:', result.rows[0].now);
    client.release();
    
    dbConnected = true;
    
    // Create tables if they don't exist
    await createTables();
    
  } catch (error) {
    console.error('Error connecting to PostgreSQL:', error.message);
    dbConnected = false;
  }
}

async function createTables() {
  try {
    // Create teachers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS teachers (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Teachers table ready');
    
    // Create years table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS years (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Years table ready');
    
    // Create students table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) UNIQUE NOT NULL,
        year_id INTEGER REFERENCES years(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Students table ready');
    
    // Create subjects table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        teacher_id INTEGER REFERENCES teachers(id),
        year_id INTEGER REFERENCES years(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Subjects table ready');
    
    // Create attendance table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
        student_id VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Present',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(subject_id, student_id)
      )
    `);
    console.log('Attendance table ready');
    
    console.log('All tables created successfully');
    
  } catch (error) {
    console.error('Error creating tables:', error.message);
  }
}

connectToDatabase();

// Middleware to check database connection
const checkDbConnection = (req, res, next) => {
  if (!pool || !dbConnected) {
    console.error('Database not connected');
    return res.status(503).json({ error: 'Database not available. Please try again.' });
  }
  next();
};

// Register endpoint
app.post('/api/register', checkDbConnection, async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if username already exists
    const existingTeacher = await pool.query('SELECT id FROM teachers WHERE username = $1', [username]);
    if (existingTeacher.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new teacher
    const result = await pool.query(
      'INSERT INTO teachers (username, password) VALUES ($1, $2) RETURNING id',
      [username, hashedPassword]
    );

    res.status(201).json({ message: 'Teacher registered successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error registering teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', checkDbConnection, async (req, res) => {
  const { username, password } = req.body;

  try {
    const teacher = await pool.query('SELECT * FROM teachers WHERE username = $1', [username]);

    if (teacher.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, teacher.rows[0].password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: teacher.rows[0].id, username: teacher.rows[0].username }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, teacher: { id: teacher.rows[0].id, username: teacher.rows[0].username } });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// ============ YEARS API ============

// GET all years
app.get('/api/years', authenticateToken, async (req, res) => {
  try {
    const years = await pool.query('SELECT * FROM years ORDER BY name');
    res.json({ years: years.rows });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new year
app.post('/api/years', authenticateToken, async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Year name is required' });
  }

  try {
    const existingYear = await pool.query('SELECT id FROM years WHERE name = $1', [name]);
    if (existingYear.rows.length > 0) {
      return res.status(400).json({ error: 'Year already exists' });
    }

    const result = await pool.query(
      'INSERT INTO years (name) VALUES ($1) RETURNING id, name',
      [name]
    );

    res.status(201).json({ year: result.rows[0] });
  } catch (error) {
    console.error('Error creating year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ STUDENTS API ============

// GET students by year
app.get('/api/students', authenticateToken, async (req, res) => {
  const { year_id } = req.query;
  
  if (!year_id) {
    return res.status(400).json({ error: 'Year ID is required' });
  }

  try {
    const students = await pool.query(
      'SELECT * FROM students WHERE year_id = $1',
      [year_id]
    );
    res.json({ students: students.rows });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST add new student
app.post('/api/students', authenticateToken, async (req, res) => {
  const { name, student_id, year_id } = req.body;
  
  if (!name || !student_id || !year_id) {
    return res.status(400).json({ error: 'Name, student_id, and year_id are required' });
  }

  try {
    const existingStudent = await pool.query(
      'SELECT id FROM students WHERE student_id = $1 AND year_id = $2',
      [student_id, year_id]
    );
    
    if (existingStudent.rows.length > 0) {
      return res.status(400).json({ error: 'Student ID already exists in this year' });
    }

    const result = await pool.query(
      'INSERT INTO students (name, student_id, year_id) VALUES ($1, $2, $3) RETURNING *',
      [name, student_id, year_id]
    );

    res.status(201).json({ student: result.rows[0] });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ SUBJECTS API ============

// GET subjects
app.get('/api/subjects', authenticateToken, async (req, res) => {
  const { year_id } = req.query;
  
  try {
    let query = 'SELECT * FROM subjects WHERE teacher_id = $1';
    let params = [req.user.id];
    
    if (year_id) {
      query += ' AND year_id = $2';
      params.push(year_id);
    }
    
    const subjects = await pool.query(query, params);
    
    // Get year names
    const years = await pool.query('SELECT * FROM years');
    const yearMap = new Map(years.rows.map(y => [y.id, y.name]));
    
    const subjectsWithYears = subjects.rows.map(subject => ({
      ...subject,
      year_name: yearMap.get(subject.year_id) || ''
    }));
    
    res.json({ subjects: subjectsWithYears });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new subject
app.post('/api/subjects', authenticateToken, async (req, res) => {
  const { name, year_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Subject name is required' });
  }

  try {
    const subjectData = {
      name,
      teacher_id: req.user.id
    };
    
    let query = 'INSERT INTO subjects (name, teacher_id) VALUES ($1, $2) RETURNING *';
    let params = [name, req.user.id];
    
    if (year_id) {
      query = 'INSERT INTO subjects (name, teacher_id, year_id) VALUES ($1, $2, $3) RETURNING *';
      params.push(year_id);
    }

    const result = await pool.query(query, params);

    res.status(201).json({ subject: result.rows[0] });
  } catch (error) {
    console.error('Error creating subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE subject
app.delete('/api/subjects/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Delete attendance records first
    await pool.query('DELETE FROM attendance WHERE subject_id = $1', [id]);
    
    // Delete subject
    const result = await pool.query(
      'DELETE FROM subjects WHERE id = $1 AND teacher_id = $2 RETURNING id',
      [id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found or not authorized' });
    }

    res.json({ message: 'Subject and associated attendance records deleted successfully' });
  } catch (error) {
    console.error('Error deleting subject:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ATTENDANCE API ============

// GET attendance for a subject
app.get('/api/attendance/subject/:subjectId', authenticateToken, async (req, res) => {
  const { subjectId } = req.params;
  
  try {
    // Get subject
    const subject = await pool.query('SELECT * FROM subjects WHERE id = $1', [subjectId]);
    if (subject.rows.length === 0) {
      return res.status(404).json({ error: 'Subject not found' });
    }
    
    // Get year name
    let yearName = '';
    if (subject.rows[0].year_id) {
      const year = await pool.query('SELECT name FROM years WHERE id = $1', [subject.rows[0].year_id]);
      yearName = year.rows.length > 0 ? year.rows[0].name : '';
    }
    
    // Get all students for this year
    let students = [];
    if (subject.rows[0].year_id) {
      const studentsResult = await pool.query(
        'SELECT * FROM students WHERE year_id = $1',
        [subject.rows[0].year_id]
      );
      students = studentsResult.rows;
    }
    
    // Get attendance records
    const attendanceRecords = await pool.query(
      'SELECT * FROM attendance WHERE subject_id = $1',
      [subjectId]
    );
    
    const attendanceMap = new Map();
    attendanceRecords.rows.forEach(record => {
      attendanceMap.set(record.student_id, record);
    });
    
    const studentsWithAttendance = students.map(student => ({
      id: student.id,
      name: student.name,
      student_id: student.student_id,
      status: attendanceMap.has(student.student_id) ? 'Present' : 'Absent',
      attendance_id: attendanceMap.has(student.student_id) ? attendanceMap.get(student.student_id).id : null,
      timestamp: attendanceMap.has(student.student_id) ? attendanceMap.get(student.student_id).timestamp : null
    }));
    
    res.json({ 
      students: studentsWithAttendance,
      subject: { ...subject.rows[0], year_name: yearName }
    });
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST record attendance
app.post('/api/attendance/record', authenticateToken, async (req, res) => {
  const { subject_id, student_id } = req.body;
  
  if (!subject_id || !student_id) {
    return res.status(400).json({ error: 'Subject ID and student ID are required' });
  }

  try {
    // Check if attendance already recorded
    const existingAttendance = await pool.query(
      'SELECT id FROM attendance WHERE subject_id = $1 AND student_id = $2',
      [subject_id, student_id]
    );
    
    if (existingAttendance.rows.length > 0) {
      return res.status(400).json({ error: 'Attendance already recorded for this student' });
    }
    
    const result = await pool.query(
      'INSERT INTO attendance (subject_id, student_id, status) VALUES ($1, $2, $3) RETURNING *',
      [subject_id, student_id, 'Present']
    );

    res.status(201).json({ 
      attendance: result.rows[0],
      message: 'Student marked as present'
    });
  } catch (error) {
    console.error('Error recording attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE clear attendance
app.delete('/api/attendance/subject/:subjectId', authenticateToken, async (req, res) => {
  const { subjectId } = req.params;
  
  try {
    const result = await pool.query(
      'DELETE FROM attendance WHERE subject_id = $1',
      [subjectId]
    );

    res.json({ message: 'Attendance records cleared successfully', deletedCount: result.rowCount });
  } catch (error) {
    console.error('Error clearing attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

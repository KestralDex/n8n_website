const express = require('express');
const jwt = require('jsonwebtoken');
const { getPool } = require('./init-db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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

// GET attendance for a subject
router.get('/subject/:subjectId', authenticateToken, async (req, res) => {
  const { subjectId } = req.params;
  
  try {
    const pool = getPool();
    
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
router.post('/record', authenticateToken, async (req, res) => {
  const { subject_id, student_id } = req.body;
  
  if (!subject_id || !student_id) {
    return res.status(400).json({ error: 'Subject ID and student ID are required' });
  }

  try {
    const pool = getPool();
    
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
router.delete('/subject/:subjectId', authenticateToken, async (req, res) => {
  const { subjectId } = req.params;
  
  try {
    const pool = getPool();
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

// GET years
router.get('/years', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    const years = await pool.query('SELECT * FROM years ORDER BY name');
    res.json({ years: years.rows });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create new year
router.post('/years', authenticateToken, async (req, res) => {
  const { name } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Year name is required' });
  }

  try {
    const pool = getPool();
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

// GET students by year
router.get('/students', authenticateToken, async (req, res) => {
  const { year_id } = req.query;
  
  if (!year_id) {
    return res.status(400).json({ error: 'Year ID is required' });
  }

  try {
    const pool = getPool();
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
router.post('/students', authenticateToken, async (req, res) => {
  const { name, student_id, year_id } = req.body;
  
  if (!name || !student_id || !year_id) {
    return res.status(400).json({ error: 'Name, student_id, and year_id are required' });
  }

  try {
    const pool = getPool();
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

module.exports = router;

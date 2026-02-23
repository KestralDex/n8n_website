const express = require('express');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const DATABASE_URL = process.env.DATABASE_URL;

// PostgreSQL connection pool (singleton)
let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

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

// GET subjects
router.get('/', authenticateToken, async (req, res) => {
  const { year_id } = req.query;
  
  try {
    const pool = getPool();
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
router.post('/', authenticateToken, async (req, res) => {
  const { name, year_id } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Subject name is required' });
  }

  try {
    const pool = getPool();
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
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    const pool = getPool();
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

module.exports = router;

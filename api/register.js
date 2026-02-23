const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { getPool } = require('./init-db');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register endpoint
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const pool = getPool();
    
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

module.exports = router;

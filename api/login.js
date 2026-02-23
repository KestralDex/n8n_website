const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
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

// Login endpoint
router.post('/', async (req, res) => {
  const { username, password } = req.body;

  try {
    const pool = getPool();
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

module.exports = router;

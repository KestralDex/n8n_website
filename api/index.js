require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

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

// Years route - standalone
app.get('/years', authenticateToken, async (req, res) => {
  try {
    const pool = getPool();
    
    // Check if years exist
    let years = await pool.query('SELECT * FROM years ORDER BY id');
    
    // Auto-create default years if none exist
    if (years.rows.length === 0) {
      const defaultYears = ['FE', 'SE', 'TE', 'BE'];
      for (const yearName of defaultYears) {
        await pool.query('INSERT INTO years (name) VALUES ($1)', [yearName]);
      }
      years = await pool.query('SELECT * FROM years ORDER BY id');
    }
    
    res.json({ years: years.rows });
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import routes
const registerRouter = require('./register');
const loginRouter = require('./login');
const protectedRouter = require('./protected');
const subjectsRouter = require('./subjects');
const attendanceRouter = require('./attendance');

// Use routes (mounted at root since vercel handles /api prefix)
app.use('/register', registerRouter);
app.use('/login', loginRouter);
app.use('/protected', protectedRouter);
app.use('/subjects', subjectsRouter);
app.use('/attendance', attendanceRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

module.exports = app;

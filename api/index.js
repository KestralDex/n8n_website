const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

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

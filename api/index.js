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

// Use routes
app.use('/api/register', registerRouter);
app.use('/api/login', loginRouter);
app.use('/api/protected', protectedRouter);
app.use('/api/subjects', subjectsRouter);
app.use('/api/attendance', attendanceRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

module.exports = app;

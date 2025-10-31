require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use environment variable
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors({
  origin: true, // Allow all origins
  credentials: true
}));
app.use(bodyParser.json());

// MongoDB connection with connection pooling
let client;
let db;
async function connectToMongoDB() {
  try {
    client = new MongoClient(MONGODB_URI, {
      maxPoolSize: 10, // Connection pooling for better performance
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db('eduapp');
    console.log('Connected to MongoDB with connection pooling');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
  }
}

connectToMongoDB();

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const teachersCollection = db.collection('teachers');
    const existingTeacher = await teachersCollection.findOne({ username });

    if (existingTeacher) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newTeacher = {
      username,
      password: hashedPassword,
      createdAt: new Date()
    };

    const result = await teachersCollection.insertOne(newTeacher);

    res.status(201).json({ message: 'Teacher registered successfully', id: result.insertedId });
  } catch (error) {
    console.error('Error registering teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const teachersCollection = db.collection('teachers');
    const teacher = await teachersCollection.findOne({ username });

    if (!teacher) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, teacher.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: teacher._id, username: teacher.username }, JWT_SECRET, { expiresIn: '1h' });

    res.json({ token, teacher: { id: teacher._id, username: teacher.username } });
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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and accessible from all network interfaces`);
});

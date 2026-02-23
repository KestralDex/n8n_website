import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    // Check if username already exists
    const existingTeacher = await sql`SELECT id FROM teachers WHERE username = ${username}`;
    if (existingTeacher.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert new teacher
    const result = await sql`INSERT INTO teachers (username, password) VALUES (${username}, ${hashedPassword}) RETURNING id`;

    res.status(201).json({ message: 'Teacher registered successfully', id: result[0].id });
  } catch (error) {
    console.error('Error registering teacher:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

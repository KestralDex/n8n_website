import postgres from 'postgres';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

// Middleware to verify JWT
const authenticateToken = (req) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    throw new Error('Access token required');
  }

  try {
    const user = jwt.verify(token, JWT_SECRET);
    return user;
  } catch (err) {
    throw new Error('Invalid token');
  }
};

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const user = authenticateToken(req);

    if (req.method === 'GET') {
      // Get subjects for the logged-in teacher
      const subjects = await sql`SELECT id, name FROM subjects WHERE teacher_id = ${user.id}`;
      res.json({ subjects });
    } else if (req.method === 'POST') {
      // Create a new subject
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: 'Subject name is required' });
      }

      const result = await sql`INSERT INTO subjects (name, teacher_id) VALUES (${name}, ${user.id}) RETURNING id, name`;
      res.status(201).json({ subject: result[0] });
    } else if (req.method === 'DELETE') {
      // Delete a subject and all its attendance records
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: 'Subject ID is required' });
      }

      // Verify subject belongs to teacher
      const subject = await sql`SELECT id FROM subjects WHERE id = ${id} AND teacher_id = ${user.id}`;
      if (subject.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to delete this subject' });
      }

      // Delete attendance records first (due to foreign key constraint)
      // Note: attendance table doesn't have teacher_id column, only subject_id
      await sql`DELETE FROM attendance WHERE subject_id = ${id}`;

      // Delete the subject
      const result = await sql`DELETE FROM subjects WHERE id = ${id} AND teacher_id = ${user.id} RETURNING id`;

      if (result.length === 0) {
        return res.status(404).json({ error: 'Subject not found or not authorized' });
      }

      res.json({ message: 'Subject and all associated attendance records deleted successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error in subjects API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

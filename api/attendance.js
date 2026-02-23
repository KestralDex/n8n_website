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

    if (req.method === 'POST') {
      // Record attendance
      const { subject_id, student_name } = req.body;
      if (!subject_id || !student_name) {
        return res.status(400).json({ error: 'Subject ID and student name are required' });
      }

      // Verify subject belongs to teacher
      const subject = await sql`SELECT id FROM subjects WHERE id = ${subject_id} AND teacher_id = ${user.id}`;
      if (subject.length === 0) {
        return res.status(403).json({ error: 'Unauthorized to record attendance for this subject' });
      }

      const result = await sql`INSERT INTO attendance (subject_id, student_name, timestamp) VALUES (${subject_id}, ${student_name}, NOW()) RETURNING id, subject_id, student_name, timestamp`;
      res.status(201).json({ attendance: result[0] });
    } else if (req.method === 'GET') {
      // Get attendance records for teacher's subjects
      const { subject_id } = req.query;
      let query = `
        SELECT a.id, a.student_name, a.timestamp, s.name as subject_name
        FROM attendance a
        JOIN subjects s ON a.subject_id = s.id
        WHERE s.teacher_id = ${user.id}
      `;
      const params = [user.id];

      if (subject_id) {
        query += ` AND a.subject_id = ${subject_id}`;
      }

      query += ' ORDER BY a.timestamp DESC';

      const attendance = await sql.unsafe(query);
      res.json({ attendance });
    } else if (req.method === 'DELETE') {
      // Clear attendance records for a subject
      const { subject_id } = req.query;
      if (!subject_id) {
        return res.status(400).json({ error: 'Subject ID is required' });
      }

      // Verify subject belongs to teacher and delete attendance records
      const result = await sql`
        DELETE FROM attendance
        WHERE subject_id = ${subject_id}
        AND subject_id IN (
          SELECT id FROM subjects WHERE id = ${subject_id} AND teacher_id = ${user.id}
        )
      `;

      if (result.count === 0) {
        // Check if subject exists and belongs to teacher
        const subject = await sql`SELECT id FROM subjects WHERE id = ${subject_id} AND teacher_id = ${user.id}`;
        if (subject.length === 0) {
          return res.status(403).json({ error: 'Unauthorized to clear attendance for this subject' });
        }
      }

      res.json({ message: 'Attendance records cleared successfully' });
    } else {
      res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    if (error.message === 'Access token required' || error.message === 'Invalid token') {
      return res.status(401).json({ error: error.message });
    }
    console.error('Error in attendance API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

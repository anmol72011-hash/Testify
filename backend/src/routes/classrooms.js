const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// Generate a unique 6-character classroom code
async function generateUniqueCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code;
  let isUnique = false;
  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const existing = await pool.query('SELECT id FROM classrooms WHERE join_code = $1', [code]);
    if (existing.rows.length === 0) isUnique = true;
  }
  return code;
}

// POST /api/classrooms — Create classroom (teacher only)
router.post('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Classroom name is required' });
    }
    const joinCode = await generateUniqueCode();
    const result = await pool.query(
      `INSERT INTO classrooms (name, teacher_id, join_code)
       VALUES ($1, $2, $3)
       RETURNING id, name, join_code, created_at`,
      [name.trim(), req.user.id, joinCode]
    );
    res.status(201).json({ classroom: result.rows[0] });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({ error: 'Failed to create classroom' });
  }
});

// GET /api/classrooms — Get teacher's classrooms
router.get('/', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.join_code, c.created_at,
              COUNT(DISTINCT cm.student_id) AS student_count,
              COUNT(DISTINCT n.id) AS note_count
       FROM classrooms c
       LEFT JOIN classroom_members cm ON c.id = cm.classroom_id
       LEFT JOIN notes n ON c.id = n.classroom_id
       WHERE c.teacher_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json({ classrooms: result.rows });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({ error: 'Failed to fetch classrooms' });
  }
});

// GET /api/classrooms/:id — Get classroom details (with students, notes count)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const classroom = await pool.query(
      `SELECT c.*, u.name AS teacher_name
       FROM classrooms c
       JOIN users u ON c.teacher_id = u.id
       WHERE c.id = $1`,
      [id]
    );
    if (classroom.rows.length === 0) {
      return res.status(404).json({ error: 'Classroom not found' });
    }

    const cls = classroom.rows[0];

    // Check access: teacher owns it or student is member
    if (req.user.role === 'teacher' && cls.teacher_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'student') {
      const membership = await pool.query(
        'SELECT id FROM classroom_members WHERE classroom_id = $1 AND student_id = $2',
        [id, req.user.id]
      );
      if (membership.rows.length === 0) {
        return res.status(403).json({ error: 'You are not a member of this classroom' });
      }
    }

    // Get students
    const students = await pool.query(
      `SELECT u.id, u.name, u.email, cm.joined_at
       FROM classroom_members cm
       JOIN users u ON cm.student_id = u.id
       WHERE cm.classroom_id = $1
       ORDER BY cm.joined_at ASC`,
      [id]
    );

    // Get notes
    const notes = await pool.query(
      `SELECT id, title, file_type, created_at FROM notes WHERE classroom_id = $1 ORDER BY created_at DESC`,
      [id]
    );

    res.json({
      classroom: cls,
      students: students.rows,
      notes: notes.rows,
    });
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({ error: 'Failed to fetch classroom details' });
  }
});

// POST /api/classrooms/join — Student joins classroom
router.post('/join', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { join_code } = req.body;
    if (!join_code) {
      return res.status(400).json({ error: 'Join code is required' });
    }

    // Check if student is already in a classroom
    const existingMembership = await pool.query(
      'SELECT id FROM classroom_members WHERE student_id = $1',
      [req.user.id]
    );
    if (existingMembership.rows.length > 0) {
      return res.status(409).json({ error: 'You are already enrolled in a classroom. Leave it first to join another.' });
    }

    // Find classroom by code
    const classroom = await pool.query(
      'SELECT * FROM classrooms WHERE join_code = $1',
      [join_code.toUpperCase()]
    );
    if (classroom.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid join code. Classroom not found.' });
    }

    const cls = classroom.rows[0];

    // Add student to classroom
    await pool.query(
      'INSERT INTO classroom_members (classroom_id, student_id) VALUES ($1, $2)',
      [cls.id, req.user.id]
    );

    res.status(201).json({
      message: 'Successfully joined classroom',
      classroom: { id: cls.id, name: cls.name, join_code: cls.join_code },
    });
  } catch (error) {
    console.error('Join classroom error:', error);
    res.status(500).json({ error: 'Failed to join classroom' });
  }
});

// GET /api/classrooms/student/mine — Student's current classroom
router.get('/student/mine', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT c.id, c.name, c.join_code, u.name AS teacher_name, cm.joined_at
       FROM classroom_members cm
       JOIN classrooms c ON cm.classroom_id = c.id
       JOIN users u ON c.teacher_id = u.id
       WHERE cm.student_id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.json({ classroom: null });
    }
    res.json({ classroom: result.rows[0] });
  } catch (error) {
    console.error('Get student classroom error:', error);
    res.status(500).json({ error: 'Failed to fetch classroom' });
  }
});

// DELETE /api/classrooms/leave — Student leaves their current classroom
router.delete('/leave', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM classroom_members WHERE student_id = $1 RETURNING classroom_id',
      [req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'You are not enrolled in any classroom' });
    }
    res.json({ message: 'Successfully left the classroom' });
  } catch (error) {
    console.error('Leave classroom error:', error);
    res.status(500).json({ error: 'Failed to leave classroom' });
  }
});

module.exports = router;

const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { generateUniqueTest } = require('../services/geminiService');

const router = express.Router();

// POST /api/tests/classroom/:classroomId/generate — Generate unique tests for all students
router.post('/classroom/:classroomId/generate', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { note_id, num_questions, timer_minutes, marks_per_question } = req.body;

    if (!note_id || !num_questions || !timer_minutes) {
      return res.status(400).json({ error: 'note_id, num_questions, and timer_minutes are required' });
    }

    // Verify teacher owns classroom
    const classroom = await pool.query(
      'SELECT id FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );
    if (classroom.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get note content
    const note = await pool.query('SELECT * FROM notes WHERE id = $1 AND classroom_id = $2', [note_id, classroomId]);
    if (note.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    const noteContent = note.rows[0].content_text;

    // Get all students in classroom
    const students = await pool.query(
      `SELECT u.id, u.name FROM classroom_members cm
       JOIN users u ON cm.student_id = u.id
       WHERE cm.classroom_id = $1`,
      [classroomId]
    );

    if (students.rows.length === 0) {
      return res.status(400).json({ error: 'No students in this classroom' });
    }

    const marksPerQ = parseInt(marks_per_question) || 1;
    const totalMarks = parseInt(num_questions) * marksPerQ;

    // Generate unique test for each student
    const generatedTests = [];
    const errors = [];

    for (const student of students.rows) {
      try {
        // Check if test already exists for this student + note combo
        const existingTest = await pool.query(
          'SELECT id FROM tests WHERE classroom_id = $1 AND student_id = $2 AND note_id = $3',
          [classroomId, student.id, note_id]
        );
        if (existingTest.rows.length > 0) {
          // Delete old test and questions
          await pool.query('DELETE FROM tests WHERE id = $1', [existingTest.rows[0].id]);
        }

        // Create test record
        const testResult = await pool.query(
          `INSERT INTO tests (classroom_id, student_id, note_id, status, timer_minutes, total_marks)
           VALUES ($1, $2, $3, 'pending', $4, $5)
           RETURNING id`,
          [classroomId, student.id, note_id, parseInt(timer_minutes), totalMarks]
        );
        const testId = testResult.rows[0].id;

        // Generate unique questions via Gemini
        const questions = await generateUniqueTest(noteContent, parseInt(num_questions), student.name);

        // Insert questions
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await pool.query(
            `INSERT INTO questions (test_id, question_text, question_type, options, correct_answers, marks, question_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [testId, q.question_text, q.question_type, JSON.stringify(q.options), JSON.stringify(q.correct_answers), marksPerQ, i]
          );
        }

        generatedTests.push({ student_id: student.id, student_name: student.name, test_id: testId });
      } catch (err) {
        console.error(`Error generating test for student ${student.name}:`, err.message);
        errors.push({ student_name: student.name, error: err.message });
      }
    }

    res.json({
      message: `Tests generated for ${generatedTests.length} students`,
      generated: generatedTests.length,
      errors: errors.length,
      errorDetails: errors,
    });
  } catch (error) {
    console.error('Generate tests error:', error);
    res.status(500).json({ error: 'Failed to generate tests: ' + error.message });
  }
});

// GET /api/tests/classroom/:classroomId — List all tests for a classroom (teacher view)
router.get('/classroom/:classroomId', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { classroomId } = req.params;
    const result = await pool.query(
      `SELECT t.id, t.status, t.timer_minutes, t.total_marks, t.created_at, t.assigned_at, t.submitted_at,
              u.name AS student_name, u.id AS student_id,
              r.marks_obtained, r.percentage, r.marks_assigned_at
       FROM tests t
       JOIN users u ON t.student_id = u.id
       LEFT JOIN results r ON r.test_id = t.id
       WHERE t.classroom_id = $1
       ORDER BY u.name ASC`,
      [classroomId]
    );
    res.json({ tests: result.rows });
  } catch (error) {
    console.error('Get classroom tests error:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// POST /api/tests/classroom/:classroomId/assign — Assign all pending tests
router.post('/classroom/:classroomId/assign', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { classroomId } = req.params;

    // Verify teacher owns classroom
    const classroom = await pool.query(
      'SELECT id FROM classrooms WHERE id = $1 AND teacher_id = $2',
      [classroomId, req.user.id]
    );
    if (classroom.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await pool.query(
      `UPDATE tests SET status = 'assigned', assigned_at = CURRENT_TIMESTAMP
       WHERE classroom_id = $1 AND status = 'pending'
       RETURNING id`,
      [classroomId]
    );

    res.json({ message: `${result.rows.length} tests assigned to students` });
  } catch (error) {
    console.error('Assign tests error:', error);
    res.status(500).json({ error: 'Failed to assign tests' });
  }
});

// GET /api/tests/student/mine — Student's assigned test
router.get('/student/mine', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.id, t.status, t.timer_minutes, t.total_marks, t.assigned_at,
              n.title AS note_title, c.name AS classroom_name
       FROM tests t
       JOIN notes n ON t.note_id = n.id
       JOIN classrooms c ON t.classroom_id = c.id
       WHERE t.student_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json({ tests: result.rows });
  } catch (error) {
    console.error('Get student tests error:', error);
    res.status(500).json({ error: 'Failed to fetch tests' });
  }
});

// GET /api/tests/:id — Get test with questions (student taking test)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const test = await pool.query(
      `SELECT t.*, n.title AS note_title, c.name AS classroom_name
       FROM tests t
       JOIN notes n ON t.note_id = n.id
       JOIN classrooms c ON t.classroom_id = c.id
       WHERE t.id = $1`,
      [id]
    );
    if (test.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    const testData = test.rows[0];

    // Check access
    if (req.user.role === 'student' && testData.student_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get questions (hide correct_answers for students)
    const questions = await pool.query(
      `SELECT id, question_text, question_type, options, marks, question_order
       ${req.user.role === 'teacher' ? ', correct_answers' : ''}
       FROM questions WHERE test_id = $1 ORDER BY question_order ASC`,
      [id]
    );

    res.json({ test: testData, questions: questions.rows });
  } catch (error) {
    console.error('Get test error:', error);
    res.status(500).json({ error: 'Failed to fetch test' });
  }
});

// POST /api/tests/:id/submit — Student submits test
router.post('/:id/submit', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body; // Array of { question_id, selected_options }

    // Verify test belongs to student
    const test = await pool.query(
      'SELECT * FROM tests WHERE id = $1 AND student_id = $2',
      [id, req.user.id]
    );
    if (test.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }
    if (test.rows[0].status !== 'assigned') {
      return res.status(400).json({ error: 'Test cannot be submitted in its current state' });
    }

    // Save student answers
    if (answers && Array.isArray(answers)) {
      for (const answer of answers) {
        await pool.query(
          `INSERT INTO student_answers (test_id, question_id, selected_options)
           VALUES ($1, $2, $3)
           ON CONFLICT (test_id, question_id) DO UPDATE SET selected_options = $3`,
          [id, answer.question_id, JSON.stringify(answer.selected_options || [])]
        );
      }
    }

    // Update test status
    await pool.query(
      `UPDATE tests SET status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );

    res.json({ message: 'Test submitted successfully' });
  } catch (error) {
    console.error('Submit test error:', error);
    res.status(500).json({ error: 'Failed to submit test' });
  }
});

module.exports = router;

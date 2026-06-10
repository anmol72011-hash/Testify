const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { gradeTest } = require('../services/geminiService');

const router = express.Router();

// POST /api/evaluation/classroom/:classroomId/evaluate — AI grades all submitted tests
router.post('/classroom/:classroomId/evaluate', authenticateToken, requireRole('teacher'), async (req, res) => {
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

    // Get all submitted tests
    const submittedTests = await pool.query(
      `SELECT t.id, t.student_id, t.total_marks, u.name AS student_name
       FROM tests t
       JOIN users u ON t.student_id = u.id
       WHERE t.classroom_id = $1 AND t.status = 'submitted'`,
      [classroomId]
    );

    if (submittedTests.rows.length === 0) {
      return res.status(400).json({ error: 'No submitted tests to evaluate' });
    }

    const graded = [];
    const errors = [];

    for (const test of submittedTests.rows) {
      try {
        // Get questions with correct answers
        const questions = await pool.query(
          `SELECT id, question_text, question_type, options, correct_answers, marks
           FROM questions WHERE test_id = $1 ORDER BY question_order ASC`,
          [test.id]
        );

        // Get student's answers
        const studentAnswers = await pool.query(
          `SELECT question_id, selected_options FROM student_answers WHERE test_id = $1`,
          [test.id]
        );

        const answerMap = {};
        studentAnswers.rows.forEach(a => {
          answerMap[a.question_id] = a.selected_options || [];
        });

        // Grade using Gemini
        const gradingResult = await gradeTest(questions.rows, answerMap, test.student_name);

        // Save per-question grading
        let totalObtained = 0;
        for (const graded_q of gradingResult.question_results) {
          await pool.query(
            `UPDATE student_answers SET is_correct = $1, marks_awarded = $2
             WHERE test_id = $3 AND question_id = $4`,
            [graded_q.is_correct, graded_q.marks_awarded, test.id, graded_q.question_id]
          );
          totalObtained += graded_q.marks_awarded;
        }

        const percentage = test.total_marks > 0
          ? parseFloat(((totalObtained / test.total_marks) * 100).toFixed(2))
          : 0;

        // Upsert result
        await pool.query(
          `INSERT INTO results (test_id, student_id, total_marks, marks_obtained, percentage, ai_feedback, graded_at)
           VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
           ON CONFLICT (test_id) DO UPDATE SET
             marks_obtained = $4, percentage = $5, ai_feedback = $6, graded_at = CURRENT_TIMESTAMP`,
          [test.id, test.student_id, test.total_marks, totalObtained, percentage, gradingResult.feedback]
        );

        // Update test status
        await pool.query(
          `UPDATE tests SET status = 'graded' WHERE id = $1`,
          [test.id]
        );

        graded.push({ student_name: test.student_name, marks_obtained: totalObtained, total: test.total_marks });
      } catch (err) {
        console.error(`Grading error for student ${test.student_name}:`, err.message);
        errors.push({ student_name: test.student_name, error: err.message });
      }
    }

    res.json({
      message: `Evaluated ${graded.length} tests`,
      graded: graded.length,
      errors: errors.length,
      results: graded,
    });
  } catch (error) {
    console.error('Evaluate error:', error);
    res.status(500).json({ error: 'Evaluation failed: ' + error.message });
  }
});

// POST /api/evaluation/classroom/:classroomId/assign-marks — Publish marks to students
router.post('/classroom/:classroomId/assign-marks', authenticateToken, requireRole('teacher'), async (req, res) => {
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

    // Publish all graded results
    const result = await pool.query(
      `UPDATE results SET marks_assigned_at = CURRENT_TIMESTAMP
       WHERE test_id IN (
         SELECT id FROM tests WHERE classroom_id = $1 AND status = 'graded'
       ) AND marks_assigned_at IS NULL
       RETURNING id`,
      [classroomId]
    );

    res.json({ message: `Marks published for ${result.rows.length} students` });
  } catch (error) {
    console.error('Assign marks error:', error);
    res.status(500).json({ error: 'Failed to assign marks' });
  }
});

// GET /api/evaluation/classroom/:classroomId/results — Teacher views all results
router.get('/classroom/:classroomId/results', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { classroomId } = req.params;
    const result = await pool.query(
      `SELECT u.name AS student_name, u.email, r.total_marks, r.marks_obtained,
              r.percentage, r.graded_at, r.marks_assigned_at, t.status AS test_status, t.id AS test_id
       FROM tests t
       JOIN users u ON t.student_id = u.id
       LEFT JOIN results r ON r.test_id = t.id
       WHERE t.classroom_id = $1
       ORDER BY r.percentage DESC NULLS LAST`,
      [classroomId]
    );
    res.json({ results: result.rows });
  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

module.exports = router;

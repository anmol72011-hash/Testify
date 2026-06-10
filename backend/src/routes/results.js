const express = require('express');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/results/test/:testId — Student views own result
router.get('/test/:testId', authenticateToken, requireRole('student'), async (req, res) => {
  try {
    const { testId } = req.params;

    // Verify test belongs to student
    const test = await pool.query(
      'SELECT * FROM tests WHERE id = $1 AND student_id = $2',
      [testId, req.user.id]
    );
    if (test.rows.length === 0) {
      return res.status(404).json({ error: 'Test not found' });
    }

    // Get result
    const result = await pool.query(
      'SELECT * FROM results WHERE test_id = $1',
      [testId]
    );
    if (result.rows.length === 0 || !result.rows[0].marks_assigned_at) {
      return res.status(400).json({ error: 'Results have not been published yet' });
    }

    // Get per-question breakdown
    const questions = await pool.query(
      `SELECT q.id, q.question_text, q.question_type, q.options, q.correct_answers, q.marks,
              sa.selected_options, sa.is_correct, sa.marks_awarded
       FROM questions q
       LEFT JOIN student_answers sa ON sa.question_id = q.id AND sa.test_id = $1
       WHERE q.test_id = $1
       ORDER BY q.question_order ASC`,
      [testId]
    );

    res.json({
      result: result.rows[0],
      questions: questions.rows,
    });
  } catch (error) {
    console.error('Get result error:', error);
    res.status(500).json({ error: 'Failed to fetch result' });
  }
});

module.exports = router;

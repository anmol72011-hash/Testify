const express = require('express');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { extractTextFromFile } = require('../services/geminiService');

const router = express.Router();

// POST /api/notes/classroom/:classroomId — Upload note
router.post(
  '/classroom/:classroomId',
  authenticateToken,
  requireRole('teacher'),
  upload.array('files', 10),
  async (req, res) => {
    try {
      const { classroomId } = req.params;
      const { title, text_content } = req.body;

      if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Note title is required' });
      }

      // Verify teacher owns this classroom
      const classroom = await pool.query(
        'SELECT id FROM classrooms WHERE id = $1 AND teacher_id = $2',
        [classroomId, req.user.id]
      );
      if (classroom.rows.length === 0) {
        return res.status(403).json({ error: 'Classroom not found or access denied' });
      }

      let fileType = 'text';
      let filePath = null;
      let contentText = text_content || '';

      if (req.files && req.files.length > 0) {
        // Save comma separated filenames
        filePath = req.files.map(f => f.filename).join(',');
        
        let allExtractedText = '';
        let hasImage = false;
        let hasPdf = false;

        for (const file of req.files) {
          const mimeType = file.mimetype;
          let extracted = '';
          
          if (mimeType === 'application/pdf') {
            hasPdf = true;
            extracted = await extractTextFromFile(file.path, 'pdf');
          } else if (mimeType.startsWith('image/')) {
            hasImage = true;
            extracted = await extractTextFromFile(file.path, 'image');
          }
          
          if (extracted) {
            allExtractedText += extracted + '\n\n';
          }
        }
        
        if (hasPdf && !hasImage) fileType = 'pdf';
        else if (hasImage && !hasPdf) fileType = 'image';
        else if (hasImage && hasPdf) fileType = 'mixed';
        
        contentText += '\n\n' + allExtractedText;
      } else if (!text_content || text_content.trim() === '') {
        return res.status(400).json({ error: 'Either text content or file uploads are required' });
      }

      const result = await pool.query(
        `INSERT INTO notes (classroom_id, title, content_text, file_path, file_type)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, title, file_type, created_at`,
        [classroomId, title.trim(), contentText, filePath, fileType]
      );

      res.status(201).json({
        message: 'Note uploaded successfully',
        note: result.rows[0],
      });
    } catch (error) {
      console.error('Upload note error:', error);
      res.status(500).json({ error: 'Failed to upload note: ' + error.message });
    }
  }
);

// GET /api/notes/classroom/:classroomId — List notes for classroom
router.get('/classroom/:classroomId', authenticateToken, async (req, res) => {
  try {
    const { classroomId } = req.params;
    const result = await pool.query(
      `SELECT id, title, file_type, created_at FROM notes
       WHERE classroom_id = $1
       ORDER BY created_at DESC`,
      [classroomId]
    );
    res.json({ notes: result.rows });
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// GET /api/notes/:id — Get single note content
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM notes WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Get note error:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// DELETE /api/notes/:id — Delete a note
router.delete('/:id', authenticateToken, requireRole('teacher'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership via classroom
    const note = await pool.query(
      `SELECT n.id, n.file_path FROM notes n
       JOIN classrooms c ON n.classroom_id = c.id
       WHERE n.id = $1 AND c.teacher_id = $2`,
      [id, req.user.id]
    );

    if (note.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found or access denied' });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Delete associated tests and questions (cascade if not set, but better explicit)
      const tests = await client.query('SELECT id FROM tests WHERE note_id = $1', [id]);
      for (const test of tests.rows) {
        await client.query('DELETE FROM questions WHERE test_id = $1', [test.id]);
        await client.query('DELETE FROM student_answers WHERE test_id = $1', [test.id]);
        await client.query('DELETE FROM results WHERE test_id = $1', [test.id]);
      }
      await client.query('DELETE FROM tests WHERE note_id = $1', [id]);

      // 2. Delete note
      await client.query('DELETE FROM notes WHERE id = $1', [id]);

      await client.query('COMMIT');

      // 3. Delete file from disk if exists
      const filePath = note.rows[0].file_path;
      if (filePath) {
        const fullPath = path.join(__dirname, '../../uploads', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      }

      res.json({ message: 'Note deleted successfully' });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;

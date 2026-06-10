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
  upload.single('file'),
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

      if (req.file) {
        filePath = req.file.filename;
        const mimeType = req.file.mimetype;

        if (mimeType === 'application/pdf') {
          fileType = 'pdf';
          // Extract text from PDF using Gemini
          contentText = await extractTextFromFile(req.file.path, 'pdf');
        } else if (mimeType.startsWith('image/')) {
          fileType = 'image';
          // Extract text from image using Gemini Vision
          contentText = await extractTextFromFile(req.file.path, 'image');
        }
      } else if (!text_content || text_content.trim() === '') {
        return res.status(400).json({ error: 'Either text content or file upload is required' });
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

module.exports = router;

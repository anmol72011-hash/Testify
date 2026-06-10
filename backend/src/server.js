const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const classroomRoutes = require('./routes/classrooms');
const noteRoutes = require('./routes/notes');
const testRoutes = require('./routes/tests');
const evaluationRoutes = require('./routes/evaluation');
const resultRoutes = require('./routes/results');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/classrooms', classroomRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/results', resultRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TESTIFY Backend is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

const { initializeDatabase } = require('./config/initDb');

// Start server with DB init
async function startServer() {
  try {
    await initializeDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 TESTIFY Backend running on http://localhost:${PORT}`);
      console.log(`✅ Database tables initialized`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;

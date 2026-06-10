const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

async function initializeDatabase() {
  try {
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, '../config/schema.sql'),
      'utf8'
    );
    await pool.query(schemaSQL);
    console.log('✅ Database schema initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
    throw error;
  }
}

module.exports = { initializeDatabase };

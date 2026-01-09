const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const initSchema = async () => {
  const fs = require('fs');
  const path = require('path');
  const schemaPath = path.join(__dirname, '../../database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(schemaSql);
    // Migration: Add plaintext_key if not exists
    await pool.query('ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS plaintext_key TEXT;');
    console.log('[DB] Schema and migrations initialized successfully');
  } catch (err) {
    console.error('[DB] Schema initialization failed:', err);
  }
};

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  initSchema,
};

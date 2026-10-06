require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('../config/database');

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

  const applied = await pool.query('SELECT filename FROM schema_migrations');
  const done = new Set(applied.rows.map((r) => r.filename));

  for (const file of files) {
    if (done.has(file)) continue;

    const sql = fs.readFileSync(path.join(dir, file), 'utf8');
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log('Applied:', file);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('FAILED:', file, '-', err.message);
      process.exitCode = 1;
      break;
    } finally {
      client.release();
    }
  }

  console.log('Migrations finished.');
}

run()
  .catch((err) => console.error(err.message))
  .finally(() => pool.end());
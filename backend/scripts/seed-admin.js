require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('../config/database');

const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

async function main() {
  const name = process.env.SEED_ADMIN_NAME || 'Administrator';
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';

  if (!email || !password) {
    console.log('Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in backend/.env first.');
    return;
  }

  if (!PASSWORD_PATTERN.test(password)) {
    console.log('SEED_ADMIN_PASSWORD is too weak (8+ chars, upper, lower, number, special).');
    return;
  }

  const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [email]);

  if (existing.rows.length > 0) {
    console.log(`A user with ${email} already exists (role: ${existing.rows[0].role}). Nothing changed.`);
    return;
  }

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status)
     VALUES ($1, $2, $3, 'admin', 'active')`,
    [name, email, hash]
  );

  console.log(`Admin created: ${email}`);
}

main()
  .catch((err) => console.error(err.message))
  .finally(() => pool.end());
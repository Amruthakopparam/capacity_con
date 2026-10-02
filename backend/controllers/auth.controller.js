const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const SIGNUP_ROLES = ['trainee', 'trainer'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;

// SIGNUP
async function signup(req, res) {
  const name =
    typeof req.body.name === 'string' ? req.body.name.trim() : '';
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';
  const password =
    typeof req.body.password === 'string' ? req.body.password : '';
  const role = req.body.role || 'trainee';

  if (!name || !email || !password) {
    return res.status(400).json({
      error: 'Name, email and password are required',
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({
      error: 'Please enter a valid email address',
    });
  }

  // Admins are never created through public signup (see scripts/seed-admin.js)
  if (!SIGNUP_ROLES.includes(role)) {
    return res.status(400).json({
      error: 'Role must be trainee or trainer',
    });
  }

  if (!PASSWORD_PATTERN.test(password)) {
    return res.status(400).json({
      error:
        'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number and one special character',
    });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // Trainees and trainers are active immediately.
    // Trainers are gated by trainer_profiles.verification_status instead.
    const result = await client.query(
      `INSERT INTO users (name, email, password_hash, role, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING id, name, email, role, status`,
      [name, email, passwordHash, role]
    );

    const user = result.rows[0];
    let verificationStatus = null;

    if (role === 'trainer') {
      const profile = await client.query(
        `INSERT INTO trainer_profiles (user_id)
         VALUES ($1)
         RETURNING verification_status`,
        [user.id]
      );
      verificationStatus = profile.rows[0].verification_status;
    }

    await client.query('COMMIT');

    res.status(201).json({
      user: { ...user, verificationStatus },
    });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});

    // Two signups with the same email at the same moment
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Email already registered' });
    }

    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  } finally {
    client.release();
  }
}

// LOGIN
async function login(req, res) {
  try {
    const email =
      typeof req.body.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    const password =
      typeof req.body.password === 'string' ? req.body.password : '';

    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    const result = await pool.query(
      `SELECT u.*, tp.verification_status
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE u.email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'active') {
      const messages = {
        suspended:
          'Your account has been suspended. Please contact the administrator.',
        rejected:
          'Your account was not approved. Please contact the administrator.',
        pending:
          'Your account is not activated yet. Please contact the administrator.',
      };

      return res.status(403).json({
        error: messages[user.status] || 'Account is not active',
      });
    }

    // The token only proves who the user is and their role.
    // Verification status is read from the database when needed, so it never goes stale.
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        verificationStatus: user.verification_status || null,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during login' });
  }
}

module.exports = {
  signup,
  login,
};
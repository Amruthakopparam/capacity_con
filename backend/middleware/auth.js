const jwt = require('jsonwebtoken');
const pool = require('../config/database');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded; // { userId, role }
    next();
  });
}

// Use this AFTER verifyToken to restrict by role
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Use this AFTER verifyToken and requireRole('trainer').
// Reads the status from the database every time, so it is never stale.
async function requireVerifiedTrainer(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.status, tp.verification_status
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1 AND u.role = 'trainer'`,
      [req.user.userId]
    );

    const row = result.rows[0];

    if (!row || row.status !== 'active') {
      return res.status(403).json({ error: 'Trainer account is not active' });
    }

    if (row.verification_status !== 'verified') {
      return res.status(403).json({
        error: 'Complete your trainer verification before using this feature.',
        code: 'TRAINER_NOT_VERIFIED',
        verificationStatus: row.verification_status || 'profile_incomplete',
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error checking trainer status' });
  }
}

module.exports = { verifyToken, requireRole, requireVerifiedTrainer };
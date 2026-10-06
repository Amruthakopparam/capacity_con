const jwt = require("jsonwebtoken");
const pool = require("../config/database");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "No token provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = decoded;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

async function requireVerifiedTrainer(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT u.status, tp.verification_status
       FROM users u
       LEFT JOIN trainer_profiles tp ON tp.user_id = u.id
       WHERE u.id = $1 AND u.role = \x27trainer\x27`,
      [req.user.userId]
    );

    const row = result.rows[0];

    if (!row || row.status !== "active") {
      return res.status(403).json({ error: "Trainer account is not active" });
    }

    if (row.verification_status !== "verified") {
      return res.status(403).json({
        error: "Complete your trainer verification before using this feature.",
        code: "TRAINER_NOT_VERIFIED",
        verificationStatus: row.verification_status || "profile_incomplete",
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error checking trainer status" });
  }
}

async function requireFieldVerified(req, res, next) {
  try {
    const fieldId = Number(req.body.fieldId);

    if (!Number.isInteger(fieldId)) {
      return res.status(400).json({ error: "fieldId is required" });
    }

    const result = await pool.query(
      `SELECT u.status, tf.test_status
       FROM users u
       JOIN trainer_fields tf ON tf.trainer_id = u.id
       WHERE u.id = $1 AND tf.field_id = $2`,
      [req.user.userId, fieldId]
    );

    const row = result.rows[0];

    if (!row || row.status !== "active") {
      return res.status(403).json({ error: "Trainer account is not active" });
    }

    if (row.test_status !== "passed") {
      return res.status(403).json({
        error: "You must pass the skill test for this field before creating a course in it.",
        code: "FIELD_NOT_VERIFIED",
        fieldId,
      });
    }

    next();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error checking field verification" });
  }
}

module.exports = {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
  requireFieldVerified,
};

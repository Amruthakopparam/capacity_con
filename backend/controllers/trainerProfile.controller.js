const pool = require('../config/database');

// A trainer can only edit their profile in these statuses
const EDITABLE_STATUSES = ['profile_incomplete', 'rejected'];

// GET /api/skill-fields
async function listSkillFields(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name FROM skill_fields WHERE is_active = TRUE ORDER BY name'
    );
    res.json({ fields: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading skill fields' });
  }
}

// Sends the error response itself and returns false if editing is not allowed
async function ensureEditable(req, res) {
  const result = await pool.query(
    'SELECT verification_status FROM trainer_profiles WHERE user_id = $1',
    [req.user.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Trainer profile not found' });
    return false;
  }

  const status = result.rows[0].verification_status;

  if (!EDITABLE_STATUSES.includes(status)) {
    res.status(403).json({
      error: 'Your profile cannot be edited in its current status',
      code: 'PROFILE_LOCKED',
      verificationStatus: status,
    });
    return false;
  }

  return true;
}

// Checks the body of an experience; returns { error } or { values }
function validateExperience(body) {
  const roleTitle =
    typeof body.roleTitle === 'string' ? body.roleTitle.trim() : '';
  const organization =
    typeof body.organization === 'string' ? body.organization.trim() : '';
  const years = Number(body.years);

  if (!roleTitle || !organization) {
    return { error: 'Role and organization are required' };
  }

  if (roleTitle.length > 150 || organization.length > 150) {
    return { error: 'Role and organization must be 150 characters or less' };
  }

  if (body.years === '' || body.years === null || !Number.isFinite(years) || years < 0 || years > 60) {
    return { error: 'Years must be a number between 0 and 60' };
  }

  return { values: { roleTitle, organization, years } };
}

function formatExperience(row) {
  return {
    id: row.id,
    roleTitle: row.role_title,
    organization: row.organization,
    years: Number(row.years),
  };
}

// GET /api/trainer/profile
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const profile = await pool.query(
      `SELECT verification_status, review_reason, resume_original_name,
              resume_uploaded_at, submitted_at, reviewed_at
       FROM trainer_profiles WHERE user_id = $1`,
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: 'Trainer profile not found' });
    }

    const fields = await pool.query(
      `SELECT sf.id, sf.name, tf.test_status
       FROM trainer_fields tf
       JOIN skill_fields sf ON sf.id = tf.field_id
       WHERE tf.trainer_id = $1
       ORDER BY sf.name`,
      [userId]
    );

    const experiences = await pool.query(
      `SELECT id, role_title, organization, years
       FROM work_experiences WHERE trainer_id = $1 ORDER BY id`,
      [userId]
    );

    const p = profile.rows[0];
    const formatted = experiences.rows.map(formatExperience);

    res.json({
      verificationStatus: p.verification_status,
      reviewReason: p.review_reason,
      submittedAt: p.submitted_at,
      reviewedAt: p.reviewed_at,
      resume: p.resume_original_name
        ? { name: p.resume_original_name, uploadedAt: p.resume_uploaded_at }
        : null,
      fields: fields.rows.map((f) => ({
        id: f.id,
        name: f.name,
        testStatus: f.test_status,
      })),
      experiences: formatted,
      totalYears: formatted.reduce((sum, e) => sum + e.years, 0),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading profile' });
  }
}

// PUT /api/trainer/fields   body: { fieldIds: [1, 2] }
async function setFields(req, res) {
  let client;

  try {
    if (!(await ensureEditable(req, res))) return;

    const raw = req.body.fieldIds;

    if (!Array.isArray(raw)) {
      return res.status(400).json({ error: 'fieldIds must be a list' });
    }

    const ids = [...new Set(raw.map(Number))];

    if (ids.length > 20 || ids.some((id) => !Number.isInteger(id) || id <= 0)) {
      return res.status(400).json({ error: 'fieldIds is not valid' });
    }

    if (ids.length > 0) {
      const valid = await pool.query(
        'SELECT id FROM skill_fields WHERE id = ANY($1::int[]) AND is_active = TRUE',
        [ids]
      );

      if (valid.rows.length !== ids.length) {
        return res.status(400).json({ error: 'One or more fields do not exist' });
      }
    }

    client = await pool.connect();
    await client.query('BEGIN');
    await client.query('DELETE FROM trainer_fields WHERE trainer_id = $1', [
      req.user.userId,
    ]);

    if (ids.length > 0) {
      await client.query(
        `INSERT INTO trainer_fields (trainer_id, field_id)
         SELECT $1, UNNEST($2::int[])`,
        [req.user.userId, ids]
      );
    }

    await client.query(
      'UPDATE trainer_profiles SET updated_at = NOW() WHERE user_id = $1',
      [req.user.userId]
    );
    await client.query('COMMIT');

    res.json({ message: 'Teaching fields saved', fieldIds: ids });
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    console.error(err);
    res.status(500).json({ error: 'Server error saving fields' });
  } finally {
    if (client) client.release();
  }
}

// POST /api/trainer/experiences
async function addExperience(req, res) {
  try {
    if (!(await ensureEditable(req, res))) return;

    const check = validateExperience(req.body);
    if (check.error) return res.status(400).json({ error: check.error });

    const { roleTitle, organization, years } = check.values;

    const result = await pool.query(
      `INSERT INTO work_experiences (trainer_id, role_title, organization, years)
       VALUES ($1, $2, $3, $4)
       RETURNING id, role_title, organization, years`,
      [req.user.userId, roleTitle, organization, years]
    );

    res.status(201).json({ experience: formatExperience(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error adding experience' });
  }
}

// PUT /api/trainer/experiences/:id
async function updateExperience(req, res) {
  try {
    if (!(await ensureEditable(req, res))) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const check = validateExperience(req.body);
    if (check.error) return res.status(400).json({ error: check.error });

    const { roleTitle, organization, years } = check.values;

    const result = await pool.query(
      `UPDATE work_experiences
       SET role_title = $1, organization = $2, years = $3
       WHERE id = $4 AND trainer_id = $5
       RETURNING id, role_title, organization, years`,
      [roleTitle, organization, years, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    res.json({ experience: formatExperience(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating experience' });
  }
}

// DELETE /api/trainer/experiences/:id
async function deleteExperience(req, res) {
  try {
    if (!(await ensureEditable(req, res))) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid experience id' });
    }

    const result = await pool.query(
      'DELETE FROM work_experiences WHERE id = $1 AND trainer_id = $2',
      [id, req.user.userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Experience not found' });
    }

    res.json({ message: 'Experience deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting experience' });
  }
}

module.exports = {
  listSkillFields,
  getProfile,
  setFields,
  addExperience,
  updateExperience,
  deleteExperience,
};
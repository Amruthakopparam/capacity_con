const pool = require('../config/database');

// A trainer can only edit their profile in these statuses
const EDITABLE_STATUSES = ['profile_incomplete', 'rejected'];
const EXPERIENCE_CAP_YEARS = 10;

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
      `SELECT verification_status, review_reason, submitted_at, reviewed_at
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

    // Resume lives in the shared documents table (document_type = 'resume')
    const resume = await pool.query(
      `SELECT file_url, uploaded_at, verification_status
       FROM documents
       WHERE user_id = $1 AND document_type = 'resume'
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [userId]
    );

    const p = profile.rows[0];
    const formatted = experiences.rows.map(formatExperience);

    res.json({
      verificationStatus: p.verification_status,
      reviewReason: p.review_reason,
      submittedAt: p.submitted_at,
      reviewedAt: p.reviewed_at,
      resume: resume.rows.length > 0
        ? {
            fileUrl: resume.rows[0].file_url,
            uploadedAt: resume.rows[0].uploaded_at,
            verificationStatus: resume.rows[0].verification_status,
          }
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

// POST /api/trainer/submit
// Moves the trainer from profile_incomplete/rejected to pending_review
async function submitForReview(req, res) {
  try {
    if (!(await ensureEditable(req, res))) return;

    const userId = req.user.userId;

    const fieldsResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM trainer_fields WHERE trainer_id = $1',
      [userId]
    );

    if (fieldsResult.rows[0].count === 0) {
      return res.status(400).json({
        error: 'Select at least one field you will teach before submitting',
      });
    }

    const experienceResult = await pool.query(
      'SELECT COUNT(*)::int AS count FROM work_experiences WHERE trainer_id = $1',
      [userId]
    );

    const resumeResult = await pool.query(
      `SELECT COUNT(*)::int AS count FROM documents
       WHERE user_id = $1 AND document_type = 'resume'`,
      [userId]
    );

    if (
      experienceResult.rows[0].count === 0 &&
      resumeResult.rows[0].count === 0
    ) {
      return res.status(400).json({
        error:
          'Add at least one work experience or upload your resume before submitting',
      });
    }

    const update = await pool.query(
      `UPDATE trainer_profiles
       SET verification_status = 'pending_review',
           submitted_at = NOW(),
           review_reason = NULL,
           reviewed_at = NULL,
           reviewed_by = NULL
       WHERE user_id = $1 AND verification_status IN ('profile_incomplete', 'rejected')
       RETURNING verification_status, submitted_at`,
      [userId]
    );

    if (update.rows.length === 0) {
      return res.status(403).json({
        error: 'Your profile cannot be submitted in its current status',
        code: 'PROFILE_LOCKED',
      });
    }

    res.json({
      message: 'Your application has been submitted for review',
      verificationStatus: update.rows[0].verification_status,
      submittedAt: update.rows[0].submitted_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error submitting profile' });
  }
}

// GET /api/trainer/competency
// Returns a 0-100 competency score per field the trainer has PASSED.
// competency = 40% experience component + 60% skill test score component
async function getCompetency(req, res) {
  try {
    const userId = req.user.userId;

    const experienceResult = await pool.query(
      'SELECT COALESCE(SUM(years), 0) AS total_years FROM work_experiences WHERE trainer_id = $1',
      [userId]
    );
    const totalYears = Number(experienceResult.rows[0].total_years);
    const experienceScore = Math.min(totalYears / EXPERIENCE_CAP_YEARS, 1) * 100;

    const fieldsResult = await pool.query(
      `SELECT sf.id AS field_id, sf.name AS field_name, tf.test_status
       FROM trainer_fields tf
       JOIN skill_fields sf ON sf.id = tf.field_id
       WHERE tf.trainer_id = $1
       ORDER BY sf.name`,
      [userId]
    );

    const competencies = [];

    for (const field of fieldsResult.rows) {
      if (field.test_status !== 'passed') {
        competencies.push({
          fieldId: field.field_id,
          fieldName: field.field_name,
          testStatus: field.test_status,
          competency: null,
        });
        continue;
      }

      const attemptResult = await pool.query(
        `SELECT score, total_questions
         FROM skill_test_attempts
         WHERE trainer_id = $1 AND field_id = $2 AND passed = true
         ORDER BY submitted_at DESC
         LIMIT 1`,
        [userId, field.field_id]
      );

      let skillScore = 0;
      if (attemptResult.rows.length > 0) {
        const { score, total_questions } = attemptResult.rows[0];
        skillScore = (Number(score) / Number(total_questions)) * 100;
      }

      const competency = Math.round(
        experienceScore * 0.4 + skillScore * 0.6
      );

      competencies.push({
        fieldId: field.field_id,
        fieldName: field.field_name,
        testStatus: field.test_status,
        experienceScore: Math.round(experienceScore),
        skillScore: Math.round(skillScore),
        competency,
      });
    }

    res.json({
      totalYears,
      experienceScore: Math.round(experienceScore),
      fields: competencies,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error calculating competency' });
  }
}

module.exports = {
  listSkillFields,
  getProfile,
  setFields,
  addExperience,
  updateExperience,
  deleteExperience,
  submitForReview,
  getCompetency,
};

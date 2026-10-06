const pool = require("../config/database");
const { createNotification } = require("../utils/notify");

async function listTrainers(req, res) {
  try {
    const status = req.query.status || "pending_review";

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, tp.verification_status, tp.submitted_at
       FROM trainer_profiles tp
       JOIN users u ON u.id = tp.user_id
       WHERE tp.verification_status = $1
       ORDER BY tp.submitted_at ASC NULLS LAST`,
      [status]
    );

    res.json({
      trainers: result.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        verificationStatus: r.verification_status,
        submittedAt: r.submitted_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error loading trainers" });
  }
}

async function getTrainerDetail(req, res) {
  try {
    const trainerId = Number(req.params.id);
    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({ error: "Invalid trainer id" });
    }

    const userResult = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1 AND role = $2",
      [trainerId, "trainer"]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: "Trainer not found" });
    }

    const profile = await pool.query(
      `SELECT verification_status, review_reason, submitted_at, reviewed_at
       FROM trainer_profiles WHERE user_id = $1`,
      [trainerId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: "Trainer profile not found" });
    }

    const fields = await pool.query(
      `SELECT sf.id, sf.name, tf.test_status
       FROM trainer_fields tf
       JOIN skill_fields sf ON sf.id = tf.field_id
       WHERE tf.trainer_id = $1
       ORDER BY sf.name`,
      [trainerId]
    );

    const experiences = await pool.query(
      `SELECT id, role_title, organization, years
       FROM work_experiences WHERE trainer_id = $1 ORDER BY id`,
      [trainerId]
    );

    const resume = await pool.query(
      `SELECT file_url, uploaded_at, verification_status
       FROM documents
       WHERE user_id = $1 AND document_type = 'resume'
       ORDER BY uploaded_at DESC
       LIMIT 1`,
      [trainerId]
    );

    const p = profile.rows[0];

    res.json({
      id: userResult.rows[0].id,
      name: userResult.rows[0].name,
      email: userResult.rows[0].email,
      verificationStatus: p.verification_status,
      reviewReason: p.review_reason,
      submittedAt: p.submitted_at,
      reviewedAt: p.reviewed_at,
      resume:
        resume.rows.length > 0
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
      experiences: experiences.rows.map((e) => ({
        id: e.id,
        roleTitle: e.role_title,
        organization: e.organization,
        years: Number(e.years),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error loading trainer detail" });
  }
}

// Moves trainer to 'test_pending'. Full 'verified' status is granted
// automatically once all selected fields show a passed skill test.
async function approveTrainer(req, res) {
  try {
    const trainerId = Number(req.params.id);
    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({ error: "Invalid trainer id" });
    }

    const result = await pool.query(
      `UPDATE trainer_profiles
       SET verification_status = 'test_pending',
           reviewed_by = $1,
           reviewed_at = NOW(),
           review_reason = NULL
       WHERE user_id = $2 AND verification_status = 'pending_review'
       RETURNING verification_status`,
      [req.user.userId, trainerId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Trainer is not awaiting review" });
    }

    await createNotification(
      trainerId,
      "Profile approved - skill test required",
      "Your trainer profile has been approved. Please complete the skill test for each of your selected fields to become a fully verified trainer.",
      "success"
    );

    res.json({
      message: "Trainer approved, moved to skill test stage",
      verificationStatus: result.rows[0].verification_status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error approving trainer" });
  }
}

async function rejectTrainer(req, res) {
  try {
    const trainerId = Number(req.params.id);
    if (!Number.isInteger(trainerId)) {
      return res.status(400).json({ error: "Invalid trainer id" });
    }

    const reason =
      typeof req.body.reason === "string" ? req.body.reason.trim() : "";

    if (!reason) {
      return res
        .status(400)
        .json({ error: "A reason is required to reject a trainer" });
    }

    if (reason.length > 500) {
      return res
        .status(400)
        .json({ error: "Reason must be 500 characters or less" });
    }

    const result = await pool.query(
      `UPDATE trainer_profiles
       SET verification_status = 'rejected',
           reviewed_by = $1,
           reviewed_at = NOW(),
           review_reason = $2
       WHERE user_id = $3 AND verification_status = 'pending_review'
       RETURNING verification_status`,
      [req.user.userId, reason, trainerId]
    );

    if (result.rows.length === 0) {
      return res.status(409).json({ error: "Trainer is not awaiting review" });
    }

    await createNotification(
      trainerId,
      "Trainer application rejected",
      `Your trainer application was rejected. Reason: ${reason}`,
      "error"
    );

    res.json({
      message: "Trainer rejected",
      verificationStatus: result.rows[0].verification_status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error rejecting trainer" });
  }
}

module.exports = {
  listTrainers,
  getTrainerDetail,
  approveTrainer,
  rejectTrainer,
};

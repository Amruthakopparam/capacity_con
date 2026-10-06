const pool = require("../config/database");

async function enrollInCourse(req, res) {
  try {
    const { batchId } = req.body;

    if (!batchId) {
      return res.status(400).json({ error: "Batch ID is required" });
    }

    const batchResult = await pool.query(
      "SELECT id, course_id, status, end_date FROM batches WHERE id = $1",
      [batchId]
    );

    if (batchResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const batch = batchResult.rows[0];

    if (batch.status === "cancelled") {
      return res.status(400).json({ error: "This batch has been cancelled" });
    }

    if (new Date(batch.end_date) < new Date()) {
      return res.status(400).json({ error: "This batch has already ended" });
    }

    const result = await pool.query(
      `INSERT INTO enrollments (course_id, trainee_id, batch_id)
       VALUES ($1, $2, $3)
       RETURNING id, course_id, trainee_id, batch_id, enrolled_at`,
      [batch.course_id, req.user.userId, batchId]
    );

    res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    console.error(err);

    if (err.code === "23505") {
      return res.status(409).json({ error: "Already enrolled in this batch" });
    }

    res.status(500).json({ error: "Server error while enrolling" });
  }
}

async function getMyEnrollments(req, res) {
  try {
    const result = await pool.query(
      `SELECT e.id AS enrollment_id, e.enrolled_at, e.batch_id,
              c.id AS course_id, c.title, c.description, c.level, c.trainer_id,
              u.name AS trainer_name,
              b.name AS batch_name, b.start_date AS batch_start_date, b.end_date AS batch_end_date
       FROM enrollments e
       JOIN courses c ON c.id = e.course_id
       JOIN users u ON u.id = c.trainer_id
       LEFT JOIN batches b ON b.id = e.batch_id
       WHERE e.trainee_id = $1
       ORDER BY e.enrolled_at DESC`,
      [req.user.userId]
    );

    res.json({ enrollments: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching enrollments" });
  }
}

module.exports = { enrollInCourse, getMyEnrollments };

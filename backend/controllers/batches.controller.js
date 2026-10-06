const pool = require("../config/database");

function computeStatus(batch) {
  if (batch.status === "cancelled") return "cancelled";
  const now = new Date();
  const start = new Date(batch.start_date);
  const end = new Date(batch.end_date);
  if (now < start) return "upcoming";
  if (now > end) return "completed";
  return "active";
}

async function createBatch(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    const { name, startDate, endDate } = req.body;

    if (!Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Invalid course id" });
    }
    if (!name || !startDate || !endDate) {
      return res.status(400).json({ error: "Name, start date and end date are required" });
    }
    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    const course = await pool.query("SELECT id FROM courses WHERE id = $1", [courseId]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const result = await pool.query(
      `INSERT INTO batches (course_id, name, start_date, end_date)
       VALUES ($1, $2, $3, $4)
       RETURNING id, course_id, name, start_date, end_date, status, created_at`,
      [courseId, name, startDate, endDate]
    );

    const batch = result.rows[0];
    res.status(201).json({ batch: { ...batch, computedStatus: computeStatus(batch) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while creating batch" });
  }
}

async function listBatchesForCourseAdmin(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Invalid course id" });
    }

    const result = await pool.query(
      `SELECT b.id, b.course_id, b.name, b.start_date, b.end_date, b.status, b.created_at,
              COUNT(e.id)::int AS enrollment_count
       FROM batches b
       LEFT JOIN enrollments e ON e.batch_id = b.id
       WHERE b.course_id = $1
       GROUP BY b.id
       ORDER BY b.start_date DESC`,
      [courseId]
    );

    res.json({
      batches: result.rows.map((b) => ({ ...b, computedStatus: computeStatus(b) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching batches" });
  }
}

async function listBatchesForCoursePublic(req, res) {
  try {
    const courseId = Number(req.params.courseId);
    if (!Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Invalid course id" });
    }

    const result = await pool.query(
      `SELECT id, course_id, name, start_date, end_date, status, created_at
       FROM batches
       WHERE course_id = $1 AND status != 'cancelled'
       ORDER BY start_date ASC`,
      [courseId]
    );

    res.json({
      batches: result.rows.map((b) => ({ ...b, computedStatus: computeStatus(b) })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching batches" });
  }
}

async function updateBatch(req, res) {
  try {
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) {
      return res.status(400).json({ error: "Invalid batch id" });
    }

    const existing = await pool.query("SELECT * FROM batches WHERE id = $1", [batchId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Batch not found" });
    }

    const current = existing.rows[0];
    const name = req.body.name ?? current.name;
    const startDate = req.body.startDate ?? current.start_date;
    const endDate = req.body.endDate ?? current.end_date;
    const status = req.body.status ?? current.status;

    const validStatuses = ["upcoming", "active", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: "End date must be after start date" });
    }

    const result = await pool.query(
      `UPDATE batches
       SET name = $1, start_date = $2, end_date = $3, status = $4
       WHERE id = $5
       RETURNING id, course_id, name, start_date, end_date, status, created_at`,
      [name, startDate, endDate, status, batchId]
    );

    const batch = result.rows[0];
    res.json({ batch: { ...batch, computedStatus: computeStatus(batch) } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating batch" });
  }
}

module.exports = {
  createBatch,
  listBatchesForCourseAdmin,
  listBatchesForCoursePublic,
  updateBatch,
};

const pool = require("../config/database");

const ALLOWED_LEVELS = ["beginner", "intermediate", "advanced"];

async function createCourse(req, res) {
  try {
    const { title, description, level, fieldId } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const parsedFieldId = Number(fieldId);
    if (!Number.isInteger(parsedFieldId)) {
      return res.status(400).json({ error: "fieldId is required" });
    }

    const courseLevel = ALLOWED_LEVELS.includes(level) ? level : "beginner";

    const result = await pool.query(
      `INSERT INTO courses (title, description, trainer_id, level, field_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, title, description, trainer_id, level, field_id, created_at`,
      [title, description, req.user.userId, courseLevel, parsedFieldId]
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while creating course" });
  }
}

async function getCourses(req, res) {
  try {
    const { level, fieldId } = req.query;

    let query = `SELECT c.id, c.title, c.description, c.trainer_id, c.level,
                        c.field_id, sf.name AS field_name, c.created_at,
                        u.name AS trainer_name
                 FROM courses c
                 JOIN users u ON u.id = c.trainer_id
                 LEFT JOIN skill_fields sf ON sf.id = c.field_id`;
    const conditions = [];
    const params = [];

    if (level && ALLOWED_LEVELS.includes(level)) {
      params.push(level);
      conditions.push(`c.level = $${params.length}`);
    }

    if (fieldId && Number.isInteger(Number(fieldId))) {
      params.push(Number(fieldId));
      conditions.push(`c.field_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY c.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ courses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching courses" });
  }
}

async function getMyCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.trainer_id, c.level,
              c.field_id, sf.name AS field_name, c.created_at
       FROM courses c
       LEFT JOIN skill_fields sf ON sf.id = c.field_id
       WHERE c.trainer_id = $1
       ORDER BY c.created_at DESC`,
      [req.user.userId]
    );

    res.json({ courses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching your courses" });
  }
}

async function getCourseById(req, res) {
  try {
    const courseId = Number(req.params.id);
    if (!Number.isInteger(courseId)) {
      return res.status(400).json({ error: "Invalid course id" });
    }

    const result = await pool.query(
      `SELECT c.id, c.title, c.description, c.level, c.trainer_id,
              c.field_id, sf.name AS field_name, c.created_at,
              u.name AS trainer_name
       FROM courses c
       JOIN users u ON u.id = c.trainer_id
       LEFT JOIN skill_fields sf ON sf.id = c.field_id
       WHERE c.id = $1`,
      [courseId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json({ course: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching course" });
  }
}

module.exports = { createCourse, getCourses, getMyCourses, getCourseById };

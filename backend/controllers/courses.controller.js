const pool = require("../config/database");

const ALLOWED_LEVELS = ["beginner", "intermediate", "advanced"];

async function createCourse(req, res) {
  try {
    const { title, description, level } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const courseLevel = ALLOWED_LEVELS.includes(level) ? level : "beginner";

    const result = await pool.query(
      `INSERT INTO courses (title, description, trainer_id, level)
       VALUES ($1, $2, $3, $4)
       RETURNING id, title, description, trainer_id, level, created_at`,
      [title, description, req.user.userId, courseLevel]
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while creating course" });
  }
}

async function getCourses(req, res) {
  try {
    const { level } = req.query;

    let query = `SELECT id, title, description, trainer_id, level, created_at FROM courses`;
    const params = [];

    if (level && ALLOWED_LEVELS.includes(level)) {
      query += ` WHERE level = $1`;
      params.push(level);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ courses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching courses" });
  }
}

module.exports = { createCourse, getCourses };

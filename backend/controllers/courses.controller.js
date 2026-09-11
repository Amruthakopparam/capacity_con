const pool = require('../config/database');

// CREATE COURSE
async function createCourse(req, res) {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO courses (title, description, trainer_id)
       VALUES ($1, $2, $3)
       RETURNING id, title, description, trainer_id, created_at`,
      [title, description, req.user.userId]
    );

    res.status(201).json({ course: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while creating course' });
  }
}

// LIST ALL COURSES
async function getCourses(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, title, description, trainer_id, created_at
       FROM courses
       ORDER BY created_at DESC`
    );

    res.json({ courses: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while fetching courses' });
  }
}

module.exports = { createCourse, getCourses };
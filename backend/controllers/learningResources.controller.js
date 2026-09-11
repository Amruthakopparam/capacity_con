const pool = require('../config/database');

// ADD A LEARNING RESOURCE
async function addResource(req, res) {
  try {
    const { courseId, title, type, url } = req.body;

    // Check required fields
    if (!courseId || !title || !type || !url) {
      return res.status(400).json({
        error: 'Course ID, title, type and URL are required',
      });
    }

    // Check if the course exists
    const course = await pool.query(
      'SELECT id FROM courses WHERE id = $1',
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check that the logged-in trainer owns the course
    const trainerCourse = await pool.query(
      'SELECT id FROM courses WHERE id = $1 AND trainer_id = $2',
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only add resources to your own course',
      });
    }

    // Add the learning resource
    const result = await pool.query(
      `INSERT INTO learning_resources (course_id, title, type, url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, course_id, title, type, url, created_at`,
      [courseId, title, type, url]
    );

    res.status(201).json({ resource: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while adding learning resource',
    });
  }
}
// GET LEARNING RESOURCES FOR A COURSE
async function getResources(req, res) {
  try {
    const { courseId } = req.params;

    // Check if the course exists
    const course = await pool.query(
      'SELECT id FROM courses WHERE id = $1',
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Check that the trainee is enrolled in the course
    const enrollment = await pool.query(
      `SELECT id
       FROM enrollments
       WHERE course_id = $1 AND trainee_id = $2`,
      [courseId, req.user.userId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        error: 'You must be enrolled in this course to view its resources',
      });
    }

    // Get the course resources
    const result = await pool.query(
      `SELECT id, course_id, title, type, url, created_at
       FROM learning_resources
       WHERE course_id = $1
       ORDER BY created_at DESC`,
      [courseId]
    );

    res.status(200).json({
      resources: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while fetching learning resources',
    });
  }
}

module.exports = { addResource, getResources };
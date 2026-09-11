const pool = require('../config/database');

// ENROLL IN A COURSE
async function enrollInCourse(req, res) {
  try {
    const { courseId } = req.body;

    // Check if a course ID was provided
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' });
    }

    // Check if the course exists
    const course = await pool.query(
      'SELECT id FROM courses WHERE id = $1',
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({ error: 'Course not found' });
    }

    // Create the enrollment
    const result = await pool.query(
      `INSERT INTO enrollments (course_id, trainee_id)
       VALUES ($1, $2)
       RETURNING id, course_id, trainee_id, enrolled_at`,
      [courseId, req.user.userId]
    );

    res.status(201).json({ enrollment: result.rows[0] });
  } catch (err) {
    console.error(err);

    // Prevent duplicate enrollment
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already enrolled in this course' });
    }

    res.status(500).json({ error: 'Server error while enrolling' });
  }
}

module.exports = { enrollInCourse };
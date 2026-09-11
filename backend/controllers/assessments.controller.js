const pool = require('../config/database');

// CREATE AN ASSESSMENT
async function createAssessment(req, res) {
  try {
    const {
      courseId,
      title,
      deadline,
      numQuestionsToShow,
    } = req.body;

    // Check required fields
    if (
      !courseId ||
      !title ||
      !deadline ||
      !numQuestionsToShow
    ) {
      return res.status(400).json({
        error: 'Course ID, title, deadline and number of questions are required',
      });
    }

    // Check that the course exists
    const course = await pool.query(
      'SELECT id FROM courses WHERE id = $1',
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({
        error: 'Course not found',
      });
    }

    // Check that the logged-in trainer owns the course
    const trainerCourse = await pool.query(
      `SELECT id
       FROM courses
       WHERE id = $1 AND trainer_id = $2`,
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only create assessments for your own course',
      });
    }

    // Check that the course has enough questions
    const questionCount = await pool.query(
      `SELECT COUNT(*) AS count
       FROM questions
       WHERE course_id = $1`,
      [courseId]
    );

    if (
      Number(questionCount.rows[0].count) < Number(numQuestionsToShow)
    ) {
      return res.status(400).json({
        error: 'Not enough questions available in this course',
      });
    }

    // Create the assessment
    const result = await pool.query(
      `INSERT INTO assessments
       (course_id, title, deadline, num_questions_to_show)
       VALUES ($1, $2, $3, $4)
       RETURNING id, course_id, title, deadline,
                 num_questions_to_show, created_at`,
      [
        courseId,
        title,
        deadline,
        numQuestionsToShow,
      ]
    );

    res.status(201).json({
      assessment: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while creating assessment',
    });
  }
}

module.exports = {
  createAssessment,
};
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

// START AN ASSESSMENT
async function startAssessment(req, res) {
  const client = await pool.connect();

  try {
    const { assessmentId } = req.params;
    const traineeId = req.user.userId;

    // Get the assessment
    const assessmentResult = await client.query(
      `SELECT id, course_id, title, deadline, num_questions_to_show
       FROM assessments
       WHERE id = $1`,
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Assessment not found',
      });
    }

    const assessment = assessmentResult.rows[0];

    // Check that the deadline has not passed
    if (new Date(assessment.deadline) <= new Date()) {
      return res.status(400).json({
        error: 'This assessment has expired',
      });
    }

    // Check that the trainee is enrolled in the course
    const enrollment = await client.query(
      `SELECT id
       FROM enrollments
       WHERE course_id = $1 AND trainee_id = $2`,
      [assessment.course_id, traineeId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        error: 'You must be enrolled in this course to take the assessment',
      });
    }

    // Check that there are enough questions
    const questionCount = await client.query(
      `SELECT COUNT(*) AS count
       FROM questions
       WHERE course_id = $1`,
      [assessment.course_id]
    );

    if (
      Number(questionCount.rows[0].count) <
      Number(assessment.num_questions_to_show)
    ) {
      return res.status(400).json({
        error: 'Not enough questions available for this assessment',
      });
    }

    await client.query('BEGIN');

    // Create the attempt
    const attemptResult = await client.query(
      `INSERT INTO attempts (trainee_id, assessment_id)
       VALUES ($1, $2)
       RETURNING id, started_at`,
      [traineeId, assessmentId]
    );

    const attemptId = attemptResult.rows[0].id;

    // Randomly select the questions
    const questionsResult = await client.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, marks
       FROM questions
       WHERE course_id = $1
       ORDER BY RANDOM()
       LIMIT $2`,
      [assessment.course_id, assessment.num_questions_to_show]
    );

    const selectedQuestions = [];

    for (const question of questionsResult.rows) {
      // Create the option list
      const options = [
        { key: 'A', text: question.option_a },
        { key: 'B', text: question.option_b },
        { key: 'C', text: question.option_c },
        { key: 'D', text: question.option_d },
      ];

      // Shuffle the option order
      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      const optionOrder = options.map((option) => option.key);

      // Save the exact option order for this attempt
      await client.query(
        `INSERT INTO attempt_questions
         (attempt_id, question_id, option_order)
         VALUES ($1, $2, $3)`,
        [attemptId, question.id, JSON.stringify(optionOrder)]
      );

      selectedQuestions.push({
        id: question.id,
        questionText: question.question_text,
        options,
        marks: question.marks,
      });
    }

    await client.query('COMMIT');

    res.status(200).json({
      attemptId,
      assessment: {
        id: assessment.id,
        title: assessment.title,
        deadline: assessment.deadline,
      },
      questions: selectedQuestions,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);

    res.status(500).json({
      error: 'Server error while starting assessment',
    });
  } finally {
    client.release();
  }
}

// SUBMIT AN ASSESSMENT
async function submitAssessment(req, res) {
  const client = await pool.connect();

  try {
    const { assessmentId } = req.params;
    const { attemptId, answers } = req.body;
    const traineeId = req.user.userId;

    // Check required fields
    if (!attemptId || !Array.isArray(answers)) {
      return res.status(400).json({
        error: 'Attempt ID and answers are required',
      });
    }

    // Check that the attempt belongs to this trainee and assessment
    const attemptResult = await client.query(
      `SELECT id, assessment_id, trainee_id, submitted_at
       FROM attempts
       WHERE id = $1
         AND assessment_id = $2
         AND trainee_id = $3`,
      [attemptId, assessmentId, traineeId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Assessment attempt not found',
      });
    }

    const attempt = attemptResult.rows[0];

    // Prevent submitting the same attempt twice
    if (attempt.submitted_at) {
      return res.status(400).json({
        error: 'This assessment has already been submitted',
      });
    }

    // Get the questions assigned to this attempt
    const questionsResult = await client.query(
      `SELECT
         aq.question_id,
         q.correct_option,
         q.marks
       FROM attempt_questions aq
       JOIN questions q ON q.id = aq.question_id
       WHERE aq.attempt_id = $1`,
      [attemptId]
    );

    if (questionsResult.rows.length === 0) {
      return res.status(400).json({
        error: 'No questions found for this attempt',
      });
    }

    let score = 0;

    // Check each submitted answer
    for (const answer of answers) {
      const question = questionsResult.rows.find(
        (q) => Number(q.question_id) === Number(answer.questionId)
      );

      if (!question) {
        continue;
      }

      if (
        String(answer.selectedOption).toUpperCase() ===
        String(question.correct_option).toUpperCase()
      ) {
        score += Number(question.marks);
      }
    }

    // Mark the attempt as submitted
    const updateResult = await client.query(
      `UPDATE attempts
       SET submitted_at = NOW(),
           score = $1
       WHERE id = $2
       RETURNING id, assessment_id, started_at, submitted_at, score`,
      [score, attemptId]
    );

    res.status(200).json({
      message: 'Assessment submitted successfully',
      attempt: updateResult.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: 'Server error while submitting assessment',
    });
  } finally {
    client.release();
  }
}

module.exports = {
  createAssessment,
  startAssessment,
  submitAssessment,
};
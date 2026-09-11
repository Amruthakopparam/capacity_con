const pool = require('../config/database');

// ADD A QUESTION
async function addQuestion(req, res) {
  try {
    const {
      courseId,
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks,
    } = req.body;

    // Check required fields
    if (
      !courseId ||
      !questionText ||
      !optionA ||
      !optionB ||
      !optionC ||
      !optionD ||
      !correctOption
    ) {
      return res.status(400).json({
        error: 'All question fields are required',
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
      'SELECT id FROM courses WHERE id = $1 AND trainer_id = $2',
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only add questions to your own course',
      });
    }

    // Add the question
    const result = await pool.query(
      `INSERT INTO questions
       (course_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, course_id, question_text, option_a, option_b,
                 option_c, option_d, correct_option, marks, created_at`,
      [
        courseId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        marks || 1,
      ]
    );

    res.status(201).json({
      question: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while adding question',
    });
  }
}

// UPDATE A QUESTION
async function updateQuestion(req, res) {
  try {
    const { questionId } = req.params;

    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption,
      marks,
    } = req.body;

    // Check that the question exists
    const question = await pool.query(
      `SELECT id, course_id
       FROM questions
       WHERE id = $1`,
      [questionId]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
      });
    }

    // Check that the logged-in trainer owns the course
    const trainerCourse = await pool.query(
      `SELECT id
       FROM courses
       WHERE id = $1 AND trainer_id = $2`,
      [question.rows[0].course_id, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only edit questions from your own course',
      });
    }

    // Update the question
    const result = await pool.query(
      `UPDATE questions
       SET question_text = $1,
           option_a = $2,
           option_b = $3,
           option_c = $4,
           option_d = $5,
           correct_option = $6,
           marks = $7
       WHERE id = $8
       RETURNING id, course_id, question_text, option_a, option_b,
                 option_c, option_d, correct_option, marks, created_at`,
      [
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        marks || 1,
        questionId,
      ]
    );

    res.status(200).json({
      question: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while updating question',
    });
  }
}

// DELETE A QUESTION
async function deleteQuestion(req, res) {
  try {
    const { questionId } = req.params;

    // Check that the question exists
    const question = await pool.query(
      `SELECT id, course_id
       FROM questions
       WHERE id = $1`,
      [questionId]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({
        error: 'Question not found',
      });
    }

    // Check that the logged-in trainer owns the course
    const trainerCourse = await pool.query(
      `SELECT id
       FROM courses
       WHERE id = $1 AND trainer_id = $2`,
      [question.rows[0].course_id, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only delete questions from your own course',
      });
    }

    // Delete the question
    await pool.query(
      'DELETE FROM questions WHERE id = $1',
      [questionId]
    );

    res.status(200).json({
      message: 'Question deleted successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while deleting question',
    });
  }
}

// ADD MULTIPLE QUESTIONS
async function addQuestionsBulk(req, res) {
  try {
    const { courseId, questions } = req.body;

    // Check required fields
    if (!courseId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'Course ID and at least one question are required',
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
      'SELECT id FROM courses WHERE id = $1 AND trainer_id = $2',
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: 'You can only add questions to your own course',
      });
    }

    // Validate every question before inserting
    for (const question of questions) {
      if (
        !question.questionText ||
        !question.optionA ||
        !question.optionB ||
        !question.optionC ||
        !question.optionD ||
        !question.correctOption
      ) {
        return res.status(400).json({
          error: 'Every question must contain all required fields',
        });
      }
    }

    // Insert all questions
    const insertedQuestions = [];

    for (const question of questions) {
      const result = await pool.query(
        `INSERT INTO questions
         (course_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, course_id, question_text, option_a, option_b,
                   option_c, option_d, correct_option, marks, created_at`,
        [
          courseId,
          question.questionText,
          question.optionA,
          question.optionB,
          question.optionC,
          question.optionD,
          question.correctOption,
          question.marks || 1,
        ]
      );

      insertedQuestions.push(result.rows[0]);
    }

    res.status(201).json({
      message: 'Questions added successfully',
      questions: insertedQuestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: 'Server error while adding questions',
    });
  }
}

module.exports = {
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
};
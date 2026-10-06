const pool = require("../config/database");

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
        error: "All question fields are required",
      });
    }

    const course = await pool.query(
      "SELECT id FROM courses WHERE id = $1",
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({
        error: "Course not found",
      });
    }

    const trainerCourse = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND trainer_id = $2",
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only add questions to your own course",
      });
    }

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
      error: "Server error while adding question",
    });
  }
}

async function listQuestionsForCourse(req, res) {
  try {
    const { courseId } = req.params;

    const trainerCourse = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND trainer_id = $2",
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only view questions from your own course",
      });
    }

    const result = await pool.query(
      `SELECT id, course_id, question_text, option_a, option_b,
              option_c, option_d, correct_option, marks, created_at
       FROM questions
       WHERE course_id = $1
       ORDER BY created_at DESC`,
      [courseId]
    );

    res.json({ questions: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching questions" });
  }
}

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

    const question = await pool.query(
      `SELECT id, course_id
       FROM questions
       WHERE id = $1`,
      [questionId]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({
        error: "Question not found",
      });
    }

    const trainerCourse = await pool.query(
      `SELECT id
       FROM courses
       WHERE id = $1 AND trainer_id = $2`,
      [question.rows[0].course_id, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only edit questions from your own course",
      });
    }

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
      error: "Server error while updating question",
    });
  }
}

async function deleteQuestion(req, res) {
  try {
    const { questionId } = req.params;

    const question = await pool.query(
      `SELECT id, course_id
       FROM questions
       WHERE id = $1`,
      [questionId]
    );

    if (question.rows.length === 0) {
      return res.status(404).json({
        error: "Question not found",
      });
    }

    const trainerCourse = await pool.query(
      `SELECT id
       FROM courses
       WHERE id = $1 AND trainer_id = $2`,
      [question.rows[0].course_id, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only delete questions from your own course",
      });
    }

    await pool.query(
      "DELETE FROM questions WHERE id = $1",
      [questionId]
    );

    res.status(200).json({
      message: "Question deleted successfully",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error while deleting question",
    });
  }
}

async function addQuestionsBulk(req, res) {
  try {
    const { courseId, questions } = req.body;

    if (!courseId || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: "Course ID and at least one question are required",
      });
    }

    const course = await pool.query(
      "SELECT id FROM courses WHERE id = $1",
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({
        error: "Course not found",
      });
    }

    const trainerCourse = await pool.query(
      "SELECT id FROM courses WHERE id = $1 AND trainer_id = $2",
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only add questions to your own course",
      });
    }

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
          error: "Every question must contain all required fields",
        });
      }
    }

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
      message: "Questions added successfully",
      questions: insertedQuestions,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Server error while adding questions",
    });
  }
}

module.exports = {
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
  listQuestionsForCourse,
};

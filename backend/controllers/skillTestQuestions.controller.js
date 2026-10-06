const pool = require('../config/database');

const VALID_OPTIONS = ['A', 'B', 'C', 'D'];

function normalizeOption(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}

async function listSkillTestQuestions(req, res) {
  try {
    const fieldId = Number(req.params.fieldId);
    if (!Number.isInteger(fieldId)) {
      return res.status(400).json({ error: 'Invalid field id' });
    }

    const field = await pool.query(
      'SELECT id FROM skill_fields WHERE id = $1',
      [fieldId]
    );

    if (field.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const includeInactive = req.query.includeInactive === 'true';

    const result = await pool.query(
      `SELECT id, field_id, question_text, option_a, option_b,
              option_c, option_d, correct_option, is_active, created_at
       FROM skill_test_questions
       WHERE field_id = $1 ${includeInactive ? '' : 'AND is_active = true'}
       ORDER BY id`,
      [fieldId]
    );

    res.json({
      questions: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error loading questions' });
  }
}

async function addSkillTestQuestion(req, res) {
  try {
    const fieldId = Number(req.params.fieldId);
    if (!Number.isInteger(fieldId)) {
      return res.status(400).json({ error: 'Invalid field id' });
    }

    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
    } = req.body;

    const correctOption = normalizeOption(req.body.correctOption);

    if (
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

    if (!VALID_OPTIONS.includes(correctOption)) {
      return res.status(400).json({
        error: 'correctOption must be one of A, B, C, D',
      });
    }

    const field = await pool.query(
      'SELECT id FROM skill_fields WHERE id = $1',
      [fieldId]
    );

    if (field.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const result = await pool.query(
      `INSERT INTO skill_test_questions
       (field_id, question_text, option_a, option_b, option_c, option_d, correct_option, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, field_id, question_text, option_a, option_b,
                 option_c, option_d, correct_option, is_active, created_at`,
      [
        fieldId,
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        req.user.userId,
      ]
    );

    res.status(201).json({
      question: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while adding question' });
  }
}

async function addSkillTestQuestionsBulk(req, res) {
  try {
    const fieldId = Number(req.params.fieldId);
    if (!Number.isInteger(fieldId)) {
      return res.status(400).json({ error: 'Invalid field id' });
    }

    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        error: 'At least one question is required',
      });
    }

    const field = await pool.query(
      'SELECT id FROM skill_fields WHERE id = $1',
      [fieldId]
    );

    if (field.rows.length === 0) {
      return res.status(404).json({ error: 'Field not found' });
    }

    const normalized = questions.map((q) => ({
      ...q,
      correctOption: normalizeOption(q.correctOption),
    }));

    for (const q of normalized) {
      if (
        !q.questionText ||
        !q.optionA ||
        !q.optionB ||
        !q.optionC ||
        !q.optionD ||
        !q.correctOption
      ) {
        return res.status(400).json({
          error: 'Every question must contain all required fields',
        });
      }
      if (!VALID_OPTIONS.includes(q.correctOption)) {
        return res.status(400).json({
          error: 'correctOption must be one of A, B, C, D for every question',
        });
      }
    }

    const insertedQuestions = [];

    for (const q of normalized) {
      const result = await pool.query(
        `INSERT INTO skill_test_questions
         (field_id, question_text, option_a, option_b, option_c, option_d, correct_option, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, field_id, question_text, option_a, option_b,
                   option_c, option_d, correct_option, is_active, created_at`,
        [
          fieldId,
          q.questionText,
          q.optionA,
          q.optionB,
          q.optionC,
          q.optionD,
          q.correctOption,
          req.user.userId,
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
    res.status(500).json({ error: 'Server error while adding questions' });
  }
}

async function updateSkillTestQuestion(req, res) {
  try {
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(questionId)) {
      return res.status(400).json({ error: 'Invalid question id' });
    }

    const {
      questionText,
      optionA,
      optionB,
      optionC,
      optionD,
    } = req.body;

    const correctOption = normalizeOption(req.body.correctOption);

    if (
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

    if (!VALID_OPTIONS.includes(correctOption)) {
      return res.status(400).json({
        error: 'correctOption must be one of A, B, C, D',
      });
    }

    const existing = await pool.query(
      'SELECT id FROM skill_test_questions WHERE id = $1',
      [questionId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const result = await pool.query(
      `UPDATE skill_test_questions
       SET question_text = $1,
           option_a = $2,
           option_b = $3,
           option_c = $4,
           option_d = $5,
           correct_option = $6
       WHERE id = $7
       RETURNING id, field_id, question_text, option_a, option_b,
                 option_c, option_d, correct_option, is_active, created_at`,
      [
        questionText,
        optionA,
        optionB,
        optionC,
        optionD,
        correctOption,
        questionId,
      ]
    );

    res.json({
      question: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while updating question' });
  }
}

async function deleteSkillTestQuestion(req, res) {
  try {
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(questionId)) {
      return res.status(400).json({ error: 'Invalid question id' });
    }

    const result = await pool.query(
      `UPDATE skill_test_questions
       SET is_active = false
       WHERE id = $1
       RETURNING id`,
      [questionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Question not found' });
    }

    res.json({
      message: 'Question deactivated successfully',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while deleting question' });
  }
}

module.exports = {
  listSkillTestQuestions,
  addSkillTestQuestion,
  addSkillTestQuestionsBulk,
  updateSkillTestQuestion,
  deleteSkillTestQuestion,
};

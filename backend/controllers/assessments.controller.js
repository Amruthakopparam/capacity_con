const pool = require("../config/database");

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function computeUnlockDate(batchStartDate, weekNumber) {
  const start = new Date(batchStartDate);
  return new Date(start.getTime() + (weekNumber - 1) * MS_PER_WEEK);
}

async function createAssessment(req, res) {
  try {
    const { courseId, title, deadline, numQuestionsToShow, weekNumber } = req.body;

    if (!courseId || !title || !deadline || !numQuestionsToShow || !weekNumber) {
      return res.status(400).json({
        error: "Course ID, title, deadline, week number and number of questions are required",
      });
    }

    if (!Number.isInteger(Number(weekNumber)) || Number(weekNumber) < 1) {
      return res.status(400).json({ error: "Week number must be a positive integer" });
    }

    const course = await pool.query("SELECT id FROM courses WHERE id = $1", [courseId]);
    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const trainerCourse = await pool.query(
      `SELECT id FROM courses WHERE id = $1 AND trainer_id = $2`,
      [courseId, req.user.userId]
    );

    if (trainerCourse.rows.length === 0) {
      return res.status(403).json({
        error: "You can only create assessments for your own course",
      });
    }

    const questionCount = await pool.query(
      `SELECT COUNT(*) AS count FROM questions WHERE course_id = $1`,
      [courseId]
    );

    if (Number(questionCount.rows[0].count) < Number(numQuestionsToShow)) {
      return res.status(400).json({
        error: "Not enough questions available in this course",
      });
    }

    const result = await pool.query(
      `INSERT INTO assessments
       (course_id, title, deadline, num_questions_to_show, week_number)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, course_id, title, deadline, num_questions_to_show, week_number, created_at`,
      [courseId, title, deadline, numQuestionsToShow, weekNumber]
    );

    res.status(201).json({ assessment: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while creating assessment" });
  }
}

async function listAssessmentsForCourse(req, res) {
  try {
    const { courseId } = req.params;

    const course = await pool.query(
      "SELECT id, trainer_id FROM courses WHERE id = $1",
      [courseId]
    );

    if (course.rows.length === 0) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isOwnerTrainer =
      req.user.role === "trainer" &&
      course.rows[0].trainer_id === req.user.userId;

    let batchStartDate = null;

    if (!isOwnerTrainer) {
      const enrollment = await pool.query(
        `SELECT e.id, b.start_date
         FROM enrollments e
         JOIN batches b ON b.id = e.batch_id
         WHERE e.course_id = $1 AND e.trainee_id = $2`,
        [courseId, req.user.userId]
      );

      if (enrollment.rows.length === 0) {
        return res.status(403).json({
          error: "You must be enrolled in this course to view its assessments",
        });
      }

      batchStartDate = enrollment.rows[0].start_date;
    }

    const assessmentsResult = await pool.query(
      `SELECT id, course_id, title, deadline, num_questions_to_show, week_number, created_at
       FROM assessments
       WHERE course_id = $1
       ORDER BY week_number ASC NULLS LAST, created_at DESC`,
      [courseId]
    );

    let attemptsByAssessment = {};

    if (!isOwnerTrainer && assessmentsResult.rows.length > 0) {
      const assessmentIds = assessmentsResult.rows.map((a) => a.id);

      const attemptsResult = await pool.query(
        `SELECT DISTINCT ON (assessment_id) assessment_id, id, score, submitted_at, started_at
         FROM attempts
         WHERE trainee_id = $1 AND assessment_id = ANY($2::int[])
         ORDER BY assessment_id, started_at DESC`,
        [req.user.userId, assessmentIds]
      );

      attemptsResult.rows.forEach((a) => {
        attemptsByAssessment[a.assessment_id] = a;
      });
    }

    const assessments = assessmentsResult.rows.map((a) => {
      let isLocked = false;
      let unlocksAt = null;

      if (!isOwnerTrainer && batchStartDate && a.week_number) {
        unlocksAt = computeUnlockDate(batchStartDate, a.week_number);
        isLocked = new Date() < unlocksAt;
      }

      return {
        ...a,
        myLatestAttempt: attemptsByAssessment[a.id] || null,
        isLocked,
        unlocksAt,
      };
    });

    res.json({ assessments, isOwnerTrainer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching assessments" });
  }
}

async function startAssessment(req, res) {
  const client = await pool.connect();

  try {
    const { assessmentId } = req.params;
    const traineeId = req.user.userId;

    const assessmentResult = await client.query(
      `SELECT id, course_id, title, deadline, num_questions_to_show, week_number
       FROM assessments
       WHERE id = $1`,
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return res.status(404).json({ error: "Assessment not found" });
    }

    const assessment = assessmentResult.rows[0];

    if (new Date(assessment.deadline) <= new Date()) {
      return res.status(400).json({ error: "This assessment has expired" });
    }

    const enrollment = await client.query(
      `SELECT e.id, b.start_date
       FROM enrollments e
       JOIN batches b ON b.id = e.batch_id
       WHERE e.course_id = $1 AND e.trainee_id = $2`,
      [assessment.course_id, traineeId]
    );

    if (enrollment.rows.length === 0) {
      return res.status(403).json({
        error: "You must be enrolled in this course to take the assessment",
      });
    }

    if (assessment.week_number) {
      const unlocksAt = computeUnlockDate(enrollment.rows[0].start_date, assessment.week_number);
      if (new Date() < unlocksAt) {
        return res.status(403).json({
          error: `This assessment unlocks on ${unlocksAt.toLocaleDateString()}`,
          unlocksAt,
        });
      }
    }

    const questionCount = await client.query(
      `SELECT COUNT(*) AS count FROM questions WHERE course_id = $1`,
      [assessment.course_id]
    );

    if (Number(questionCount.rows[0].count) < Number(assessment.num_questions_to_show)) {
      return res.status(400).json({
        error: "Not enough questions available for this assessment",
      });
    }

    await client.query("BEGIN");

    const attemptResult = await client.query(
      `INSERT INTO attempts (trainee_id, assessment_id)
       VALUES ($1, $2)
       RETURNING id, started_at`,
      [traineeId, assessmentId]
    );

    const attemptId = attemptResult.rows[0].id;

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
      const options = [
        { key: "A", text: question.option_a },
        { key: "B", text: question.option_b },
        { key: "C", text: question.option_c },
        { key: "D", text: question.option_d },
      ];

      for (let i = options.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]];
      }

      const optionOrder = options.map((option) => option.key);

      await client.query(
        `INSERT INTO attempt_questions (attempt_id, question_id, option_order)
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

    await client.query("COMMIT");

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
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: "Server error while starting assessment" });
  } finally {
    client.release();
  }
}

async function submitAssessment(req, res) {
  const client = await pool.connect();

  try {
    const { assessmentId } = req.params;
    const { attemptId, answers } = req.body;
    const traineeId = req.user.userId;

    if (!attemptId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "Attempt ID and answers are required" });
    }

    const attemptResult = await client.query(
      `SELECT a.id, a.assessment_id, a.trainee_id, a.submitted_at, ase.course_id
       FROM attempts a
       JOIN assessments ase ON ase.id = a.assessment_id
       WHERE a.id = $1 AND a.assessment_id = $2 AND a.trainee_id = $3`,
      [attemptId, assessmentId, traineeId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: "Assessment attempt not found" });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.submitted_at) {
      return res.status(400).json({ error: "This assessment has already been submitted" });
    }

    const questionsResult = await client.query(
      `SELECT aq.question_id, q.correct_option, q.marks
       FROM attempt_questions aq
       JOIN questions q ON q.id = aq.question_id
       WHERE aq.attempt_id = $1`,
      [attemptId]
    );

    if (questionsResult.rows.length === 0) {
      return res.status(400).json({ error: "No questions found for this attempt" });
    }

    let score = 0;

    for (const answer of answers) {
      const question = questionsResult.rows.find(
        (q) => Number(q.question_id) === Number(answer.questionId)
      );
      if (!question) continue;

      if (
        String(answer.selectedOption).toUpperCase() ===
        String(question.correct_option).toUpperCase()
      ) {
        score += Number(question.marks);
      }
    }

    const updateResult = await client.query(
      `UPDATE attempts
       SET submitted_at = NOW(), score = $1
       WHERE id = $2
       RETURNING id, assessment_id, started_at, submitted_at, score`,
      [score, attemptId]
    );

    // NOTE: Certificate issuance no longer happens here. Module assessments are now
    // practice-only; certificates are issued solely via the Main Test (see mainTest.controller.js),
    // which blends weekly assessment average (20%) with main test score (80%).

    res.status(200).json({
      message: "Assessment submitted successfully",
      attempt: updateResult.rows[0],
      certificate: null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while submitting assessment" });
  } finally {
    client.release();
  }
}

module.exports = {
  createAssessment,
  startAssessment,
  submitAssessment,
  listAssessmentsForCourse,
};

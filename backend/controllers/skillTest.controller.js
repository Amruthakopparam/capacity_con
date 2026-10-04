const pool = require("../config/database");
const { createNotification } = require("../utils/notify");

const QUESTIONS_PER_ATTEMPT = 15;
const PASS_PERCENTAGE = 0.7;
const TIME_LIMIT_MINUTES = 20;
const RETEST_COOLDOWN_DAYS = 4;

function shuffleOptions(question) {
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

  return options;
}

// Shared grading + status-update logic used by both manual submit and auto-expire
async function finalizeAttempt(client, { attemptId, trainerId, fieldId, totalQuestions, answers }) {
  const questionsResult = await client.query(
    `SELECT atq.question_id, q.correct_option
     FROM skill_test_attempt_questions atq
     JOIN skill_test_questions q ON q.id = atq.question_id
     WHERE atq.attempt_id = $1`,
    [attemptId]
  );

  let score = 0;
  for (const answer of answers) {
    const question = questionsResult.rows.find(
      (q) => Number(q.question_id) === Number(answer.questionId)
    );
    if (!question) continue;

    if (
      typeof answer.selectedOption === "string" &&
      answer.selectedOption.toUpperCase() === question.correct_option
    ) {
      score += 1;
    }
  }

  const passThreshold = Math.ceil(totalQuestions * PASS_PERCENTAGE);
  const passed = score >= passThreshold;

  await client.query(
    `UPDATE skill_test_attempts
     SET submitted_at = NOW(), score = $1, passed = $2
     WHERE id = $3`,
    [score, passed, attemptId]
  );

  await client.query(
    `UPDATE trainer_fields
     SET test_status = $1
     WHERE trainer_id = $2 AND field_id = $3`,
    [passed ? "passed" : "failed", trainerId, fieldId]
  );

  const allFields = await client.query(
    `SELECT test_status FROM trainer_fields WHERE trainer_id = $1`,
    [trainerId]
  );

  const allPassed =
    allFields.rows.length > 0 &&
    allFields.rows.every((f) => f.test_status === "passed");

  let verificationStatus = null;

  if (allPassed) {
    await client.query(
      `UPDATE trainer_profiles
       SET verification_status = 'verified', verified_at = NOW()
       WHERE user_id = $1`,
      [trainerId]
    );
    verificationStatus = "verified";
  } else {
    await client.query(
      `UPDATE trainer_profiles
       SET verification_status = 'test_pending'
       WHERE user_id = $1 AND verification_status = 'test_in_progress'`,
      [trainerId]
    );
  }

  return { score, passThreshold, passed, allPassed, verificationStatus };
}

// GET /api/skill-test/fields
async function getMyFieldsStatus(req, res) {
  try {
    const trainerId = req.user.userId;

    const result = await pool.query(
      `SELECT tf.field_id, sf.name AS field_name, tf.test_status,
              (SELECT submitted_at FROM skill_test_attempts
               WHERE trainer_id = $1 AND field_id = tf.field_id
               ORDER BY submitted_at DESC NULLS LAST LIMIT 1) AS last_attempt_at,
              (SELECT passed FROM skill_test_attempts
               WHERE trainer_id = $1 AND field_id = tf.field_id
               ORDER BY submitted_at DESC NULLS LAST LIMIT 1) AS last_attempt_passed
       FROM trainer_fields tf
       JOIN skill_fields sf ON sf.id = tf.field_id
       WHERE tf.trainer_id = $1
       ORDER BY sf.name`,
      [trainerId]
    );

    const fields = result.rows.map((r) => {
      let cooldownUntil = null;
      if (
        r.test_status === "failed" &&
        r.last_attempt_at &&
        r.last_attempt_passed === false
      ) {
        const cooldownEnd = new Date(r.last_attempt_at);
        cooldownEnd.setDate(cooldownEnd.getDate() + RETEST_COOLDOWN_DAYS);
        if (cooldownEnd > new Date()) {
          cooldownUntil = cooldownEnd;
        }
      }

      return {
        fieldId: r.field_id,
        fieldName: r.field_name,
        testStatus: r.test_status,
        lastAttemptAt: r.last_attempt_at,
        cooldownUntil,
      };
    });

    res.json({ fields });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error loading field status" });
  }
}

// POST /api/skill-test/:fieldId/start
async function startTest(req, res) {
  const client = await pool.connect();

  try {
    const trainerId = req.user.userId;
    const fieldId = Number(req.params.fieldId);

    if (!Number.isInteger(fieldId)) {
      return res.status(400).json({ error: "Invalid field id" });
    }

    const trainerField = await client.query(
      `SELECT test_status FROM trainer_fields
       WHERE trainer_id = $1 AND field_id = $2`,
      [trainerId, fieldId]
    );

    if (trainerField.rows.length === 0) {
      return res.status(403).json({
        error: "You have not selected this field during onboarding",
      });
    }

    if (trainerField.rows[0].test_status === "passed") {
      return res.status(400).json({
        error: "You have already passed the test for this field",
      });
    }

    const profile = await client.query(
      `SELECT verification_status FROM trainer_profiles WHERE user_id = $1`,
      [trainerId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ error: "Trainer profile not found" });
    }

    const status = profile.rows[0].verification_status;
    if (!["test_pending", "test_in_progress"].includes(status)) {
      return res.status(403).json({
        error: "You are not currently eligible to take a skill test",
        verificationStatus: status,
      });
    }

    // Check for an existing in-progress attempt for this field
    const activeAttempt = await client.query(
      `SELECT id, started_at, time_limit_minutes, total_questions
       FROM skill_test_attempts
       WHERE trainer_id = $1 AND field_id = $2 AND submitted_at IS NULL`,
      [trainerId, fieldId]
    );

    if (activeAttempt.rows.length > 0) {
      const active = activeAttempt.rows[0];
      const totalSeconds = active.time_limit_minutes * 60;
      const elapsedSeconds = Math.floor(
        (Date.now() - new Date(active.started_at).getTime()) / 1000
      );

      if (elapsedSeconds >= totalSeconds) {
        // Time already ran out while the trainer was away - auto-submit with no answers
        const fieldNameResult = await client.query(
          "SELECT name FROM skill_fields WHERE id = $1",
          [fieldId]
        );
        const fieldName = fieldNameResult.rows[0]?.name || "this field";

        await client.query("BEGIN");
        const outcome = await finalizeAttempt(client, {
          attemptId: active.id,
          trainerId,
          fieldId,
          totalQuestions: active.total_questions,
          answers: [],
        });
        await client.query("COMMIT");

        await createNotification(
          trainerId,
          "Skill test expired",
          `Your previous attempt for ${fieldName} timed out and was automatically submitted with a score of ${outcome.score}/${active.total_questions}.`,
          "warning"
        );

        return res.status(409).json({
          error: "Your previous attempt for this field timed out and was automatically submitted",
          expired: true,
          score: outcome.score,
          totalQuestions: active.total_questions,
          passed: outcome.passed,
        });
      }

      // Still within time limit - resume with the exact same questions and option order
      const resumeQuestions = await client.query(
        `SELECT atq.question_id, atq.option_order, q.question_text,
                q.option_a, q.option_b, q.option_c, q.option_d
         FROM skill_test_attempt_questions atq
         JOIN skill_test_questions q ON q.id = atq.question_id
         WHERE atq.attempt_id = $1
         ORDER BY atq.question_id`,
        [active.id]
      );

      const questions = resumeQuestions.rows.map((q) => {
        const textByKey = {
          A: q.option_a,
          B: q.option_b,
          C: q.option_c,
          D: q.option_d,
        };
        const order = q.option_order;

        return {
          id: q.question_id,
          questionText: q.question_text,
          options: order.map((key) => ({ key, text: textByKey[key] })),
        };
      });

      return res.status(200).json({
        attemptId: active.id,
        startedAt: active.started_at,
        timeLimitMinutes: active.time_limit_minutes,
        remainingSeconds: totalSeconds - elapsedSeconds,
        resumed: true,
        questions,
      });
    }

    // No active attempt - check cooldown from the most recent submitted attempt
    const lastAttempt = await client.query(
      `SELECT submitted_at, passed FROM skill_test_attempts
       WHERE trainer_id = $1 AND field_id = $2 AND submitted_at IS NOT NULL
       ORDER BY submitted_at DESC LIMIT 1`,
      [trainerId, fieldId]
    );

    if (lastAttempt.rows.length > 0 && lastAttempt.rows[0].passed === false) {
      const cooldownEnd = new Date(lastAttempt.rows[0].submitted_at);
      cooldownEnd.setDate(cooldownEnd.getDate() + RETEST_COOLDOWN_DAYS);

      if (cooldownEnd > new Date()) {
        return res.status(403).json({
          error: "You must wait before retaking this test",
          retryAvailableAt: cooldownEnd,
        });
      }
    }

    const questionsResult = await client.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option
       FROM skill_test_questions
       WHERE field_id = $1 AND is_active = true
       ORDER BY RANDOM()
       LIMIT $2`,
      [fieldId, QUESTIONS_PER_ATTEMPT]
    );

    if (questionsResult.rows.length < QUESTIONS_PER_ATTEMPT) {
      return res.status(400).json({
        error: `Not enough questions available for this field yet (need ${QUESTIONS_PER_ATTEMPT}, have ${questionsResult.rows.length})`,
      });
    }

    await client.query("BEGIN");

    const attemptResult = await client.query(
      `INSERT INTO skill_test_attempts
       (trainer_id, field_id, total_questions, time_limit_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, started_at, time_limit_minutes`,
      [trainerId, fieldId, QUESTIONS_PER_ATTEMPT, TIME_LIMIT_MINUTES]
    );

    const attemptId = attemptResult.rows[0].id;
    const responseQuestions = [];

    for (const question of questionsResult.rows) {
      const options = shuffleOptions(question);
      const optionOrder = options.map((o) => o.key);

      await client.query(
        `INSERT INTO skill_test_attempt_questions
         (attempt_id, question_id, option_order)
         VALUES ($1, $2, $3)`,
        [attemptId, question.id, JSON.stringify(optionOrder)]
      );

      responseQuestions.push({
        id: question.id,
        questionText: question.question_text,
        options: options.map((o) => ({ key: o.key, text: o.text })),
      });
    }

    if (status === "test_pending") {
      await client.query(
        `UPDATE trainer_profiles SET verification_status = 'test_in_progress' WHERE user_id = $1`,
        [trainerId]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      attemptId,
      startedAt: attemptResult.rows[0].started_at,
      timeLimitMinutes: attemptResult.rows[0].time_limit_minutes,
      remainingSeconds: TIME_LIMIT_MINUTES * 60,
      resumed: false,
      questions: responseQuestions,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: "Server error while starting test" });
  } finally {
    client.release();
  }
}

// POST /api/skill-test/attempts/:attemptId/submit
async function submitTest(req, res) {
  const client = await pool.connect();

  try {
    const trainerId = req.user.userId;
    const attemptId = Number(req.params.attemptId);
    const { answers } = req.body;

    if (!Number.isInteger(attemptId)) {
      return res.status(400).json({ error: "Invalid attempt id" });
    }

    if (!Array.isArray(answers)) {
      return res.status(400).json({ error: "Answers must be an array" });
    }

    const attemptResult = await client.query(
      `SELECT id, trainer_id, field_id, submitted_at, total_questions
       FROM skill_test_attempts
       WHERE id = $1 AND trainer_id = $2`,
      [attemptId, trainerId]
    );

    if (attemptResult.rows.length === 0) {
      return res.status(404).json({ error: "Attempt not found" });
    }

    const attempt = attemptResult.rows[0];

    if (attempt.submitted_at) {
      return res.status(400).json({ error: "This attempt has already been submitted" });
    }

    const fieldNameResult = await client.query(
      "SELECT name FROM skill_fields WHERE id = $1",
      [attempt.field_id]
    );
    const fieldName = fieldNameResult.rows[0]?.name || "your field";

    await client.query("BEGIN");

    const outcome = await finalizeAttempt(client, {
      attemptId,
      trainerId,
      fieldId: attempt.field_id,
      totalQuestions: attempt.total_questions,
      answers,
    });

    await client.query("COMMIT");

    if (outcome.passed) {
      await createNotification(
        trainerId,
        "Skill test passed",
        `You passed the skill test for ${fieldName} with a score of ${outcome.score}/${attempt.total_questions}.`,
        "success"
      );
    } else {
      await createNotification(
        trainerId,
        "Skill test not passed",
        `You scored ${outcome.score}/${attempt.total_questions} on the ${fieldName} test, which is below the passing threshold. You can retake it after ${RETEST_COOLDOWN_DAYS} days.`,
        "warning"
      );
    }

    if (outcome.verificationStatus === "verified") {
      await createNotification(
        trainerId,
        "You are now a verified trainer!",
        "Congratulations! You have passed all required skill tests and are now a verified trainer on Capacity Connect.",
        "success"
      );
    }

    res.json({
      score: outcome.score,
      totalQuestions: attempt.total_questions,
      passThreshold: outcome.passThreshold,
      passed: outcome.passed,
      verificationStatus: outcome.verificationStatus,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: "Server error while submitting test" });
  } finally {
    client.release();
  }
}

module.exports = {
  getMyFieldsStatus,
  startTest,
  submitTest,
};

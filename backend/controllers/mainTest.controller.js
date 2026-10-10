const pool = require("../config/database");
const { createNotification } = require("../utils/notify");
const { checkMainTestCertificate } = require("./certificates.controller");

// ---------- helpers ----------

async function getOwnedBatch(batchId, trainerId) {
  const result = await pool.query(
    `SELECT b.id AS batch_id, b.course_id, c.trainer_id
     FROM batches b JOIN courses c ON c.id = b.course_id
     WHERE b.id = $1`,
    [batchId]
  );
  if (result.rows.length === 0) return null;
  if (result.rows[0].trainer_id !== trainerId) return "forbidden";
  return result.rows[0];
}

function computeWindow(mainTest) {
  if (!mainTest.scheduled_at || !mainTest.duration_minutes) {
    return { opensAt: null, closesAt: null, windowStatus: "not_scheduled" };
  }
  const opensAt = new Date(mainTest.scheduled_at);
  const closesAt = new Date(opensAt.getTime() + mainTest.duration_minutes * 60000);
  const now = new Date();
  let windowStatus;
  if (now < opensAt) windowStatus = "upcoming";
  else if (now <= closesAt) windowStatus = "open";
  else windowStatus = "closed";
  return { opensAt, closesAt, windowStatus };
}

function validateOptionAndMarks(correctOption, marks) {
  const opt = String(correctOption).toUpperCase();
  if (!["A", "B", "C", "D"].includes(opt)) {
    return { error: "correctOption must be one of A, B, C, D" };
  }
  const marksNum = Number(marks);
  if (!Number.isInteger(marksNum) || marksNum <= 0) {
    return { error: "marks must be a positive integer" };
  }
  return { opt, marksNum };
}

async function finalizeMainTestAttempt(client, { attemptId, totalMarks, passPercentage, answers }) {
  const questionsResult = await client.query(
    `SELECT atq.question_id, q.correct_option, q.marks
     FROM main_test_attempt_questions atq
     JOIN main_test_questions q ON q.id = atq.question_id
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
      score += Number(question.marks);
    }
  }

  const passed = (score / totalMarks) * 100 >= Number(passPercentage);

  const updated = await client.query(
    `UPDATE main_test_attempts
     SET submitted_at = NOW(), score = $1, passed = $2
     WHERE id = $3
     RETURNING id, main_test_id, trainee_id, score, total_questions, passed, submitted_at`,
    [score, passed, attemptId]
  );

  return updated.rows[0];
}

// ---------- TRAINER ----------

async function trainerAddQuestions(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) return res.status(400).json({ error: "Invalid batch id" });

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const rawQuestions = Array.isArray(req.body.questions) ? req.body.questions : [req.body];
    if (rawQuestions.length === 0) {
      return res.status(400).json({ error: "At least one question is required" });
    }

    const normalized = [];
    for (const q of rawQuestions) {
      const { questionText, optionA, optionB, optionC, optionD, correctOption, marks } = q;
      if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption || marks === undefined) {
        return res.status(400).json({ error: "Each question requires questionText, optionA-D, correctOption and marks" });
      }
      const v = validateOptionAndMarks(correctOption, marks);
      if (v.error) return res.status(400).json({ error: v.error });
      normalized.push({ questionText, optionA, optionB, optionC, optionD, correctOption: v.opt, marks: v.marksNum });
    }

    let mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);
    let mainTest;

    if (mainTestResult.rows.length === 0) {
      const created = await pool.query(
        `INSERT INTO main_tests (batch_id, status, created_by) VALUES ($1, 'draft', $2) RETURNING *`,
        [batchId, trainerId]
      );
      mainTest = created.rows[0];
    } else {
      mainTest = mainTestResult.rows[0];
      if (mainTest.status !== "draft") {
        return res.status(403).json({
          error: "This main test has already been submitted and can no longer be edited",
          status: mainTest.status,
        });
      }
    }

    const inserted = [];
    for (const q of normalized) {
      const result = await pool.query(
        `INSERT INTO main_test_questions
         (main_test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, added_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, question_text, option_a, option_b, option_c, option_d, correct_option, marks`,
        [mainTest.id, q.questionText, q.optionA, q.optionB, q.optionC, q.optionD, q.correctOption, q.marks, trainerId]
      );
      inserted.push(result.rows[0]);
    }

    const allQuestions = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
       FROM main_test_questions WHERE main_test_id = $1 ORDER BY id`,
      [mainTest.id]
    );

    const totalMarksSoFar = allQuestions.rows.reduce((s, r) => s + Number(r.marks), 0);

    res.status(201).json({
      mainTestId: mainTest.id,
      status: mainTest.status,
      added: inserted,
      questions: allQuestions.rows,
      totalMarksSoFar,
      targetTotalMarks: mainTest.total_marks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while adding main test questions" });
  }
}

async function trainerListQuestions(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) return res.status(400).json({ error: "Invalid batch id" });

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);

    if (mainTestResult.rows.length === 0) {
      return res.json({ mainTestId: null, status: null, questions: [], totalMarksSoFar: 0 });
    }

    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "draft") {
      return res.status(403).json({
        error: "This main test has already been submitted; questions are no longer accessible to trainers",
        status: mainTest.status,
      });
    }

    const questions = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
       FROM main_test_questions WHERE main_test_id = $1 ORDER BY id`,
      [mainTest.id]
    );

    const totalMarksSoFar = questions.rows.reduce((s, r) => s + Number(r.marks), 0);

    res.json({
      mainTestId: mainTest.id,
      status: mainTest.status,
      questions: questions.rows,
      totalMarksSoFar,
      targetTotalMarks: mainTest.total_marks,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching main test questions" });
  }
}

async function trainerUpdateQuestion(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(batchId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found for this batch" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "draft") {
      return res.status(403).json({ error: "This main test has already been submitted and can no longer be edited" });
    }

    const existing = await pool.query(
      `SELECT * FROM main_test_questions WHERE id = $1 AND main_test_id = $2`,
      [questionId, mainTest.id]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Question not found" });
    const current = existing.rows[0];

    const { questionText, optionA, optionB, optionC, optionD, correctOption, marks } = req.body;

    const newText = questionText ?? current.question_text;
    const newA = optionA ?? current.option_a;
    const newB = optionB ?? current.option_b;
    const newC = optionC ?? current.option_c;
    const newD = optionD ?? current.option_d;
    let newCorrect = current.correct_option;
    let newMarks = current.marks;

    if (correctOption !== undefined || marks !== undefined) {
      const v = validateOptionAndMarks(correctOption ?? current.correct_option, marks ?? current.marks);
      if (v.error) return res.status(400).json({ error: v.error });
      newCorrect = v.opt;
      newMarks = v.marksNum;
    }

    const result = await pool.query(
      `UPDATE main_test_questions
       SET question_text=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5, correct_option=$6, marks=$7
       WHERE id = $8
       RETURNING id, question_text, option_a, option_b, option_c, option_d, correct_option, marks`,
      [newText, newA, newB, newC, newD, newCorrect, newMarks, questionId]
    );

    res.json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating question" });
  }
}

async function trainerDeleteQuestion(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(batchId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found for this batch" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "draft") {
      return res.status(403).json({ error: "This main test has already been submitted and can no longer be edited" });
    }

    const result = await pool.query(
      `DELETE FROM main_test_questions WHERE id = $1 AND main_test_id = $2 RETURNING id`,
      [questionId, mainTest.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Question not found" });

    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while deleting question" });
  }
}

async function trainerSubmitMainTest(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) return res.status(400).json({ error: "Invalid batch id" });

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);
    if (mainTestResult.rows.length === 0) {
      return res.status(404).json({ error: "No main test draft found for this batch yet" });
    }
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "draft") {
      return res.status(400).json({ error: "This main test has already been submitted", status: mainTest.status });
    }

    const questions = await pool.query(
      `SELECT marks FROM main_test_questions WHERE main_test_id = $1`,
      [mainTest.id]
    );

    if (questions.rows.length === 0) {
      return res.status(400).json({ error: "Cannot submit a main test with no questions" });
    }

    const totalMarks = questions.rows.reduce((s, r) => s + Number(r.marks), 0);

    if (totalMarks !== mainTest.total_marks) {
      return res.status(400).json({
        error: `Total marks must equal ${mainTest.total_marks}. Current total is ${totalMarks}.`,
        currentTotal: totalMarks,
        required: mainTest.total_marks,
      });
    }

    const updated = await pool.query(
      `UPDATE main_tests
       SET status = 'pending_review', total_questions = $1
       WHERE id = $2
       RETURNING id, batch_id, status, total_questions, total_marks`,
      [questions.rows.length, mainTest.id]
    );

    res.json({
      message: "Main test submitted for admin review. You no longer have access to these questions.",
      mainTest: updated.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while submitting main test" });
  }
}

async function trainerGetStatus(req, res) {
  try {
    const trainerId = req.user.userId;
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) return res.status(400).json({ error: "Invalid batch id" });

    const batch = await getOwnedBatch(batchId, trainerId);
    if (batch === null) return res.status(404).json({ error: "Batch not found" });
    if (batch === "forbidden") return res.status(403).json({ error: "You do not own the course for this batch" });

    const mainTestResult = await pool.query(
      `SELECT id, status, total_questions, total_marks, scheduled_at, duration_minutes
       FROM main_tests WHERE batch_id = $1`,
      [batchId]
    );

    if (mainTestResult.rows.length === 0) {
      return res.json({ status: "not_created" });
    }

    res.json({ mainTest: mainTestResult.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching main test status" });
  }
}

// ---------- ADMIN ----------

async function adminListPending(req, res) {
  try {
    const result = await pool.query(
      `SELECT mt.id, mt.batch_id, mt.status, mt.total_questions, mt.total_marks, mt.created_at,
              b.name AS batch_name, c.title AS course_title, u.name AS trainer_name
       FROM main_tests mt
       JOIN batches b ON b.id = mt.batch_id
       JOIN courses c ON c.id = b.course_id
       JOIN users u ON u.id = c.trainer_id
       WHERE mt.status = 'pending_review'
       ORDER BY mt.created_at ASC`
    );
    res.json({ mainTests: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching pending main tests" });
  }
}

async function adminGetMainTest(req, res) {
  try {
    const mainTestId = Number(req.params.mainTestId);
    if (!Number.isInteger(mainTestId)) return res.status(400).json({ error: "Invalid main test id" });

    const mainTestResult = await pool.query(
      `SELECT mt.*, b.name AS batch_name, b.start_date, b.end_date, c.title AS course_title, c.id AS course_id
       FROM main_tests mt
       JOIN batches b ON b.id = mt.batch_id
       JOIN courses c ON c.id = b.course_id
       WHERE mt.id = $1`,
      [mainTestId]
    );

    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    const questions = await pool.query(
      `SELECT id, question_text, option_a, option_b, option_c, option_d, correct_option, marks
       FROM main_test_questions WHERE main_test_id = $1 ORDER BY id`,
      [mainTestId]
    );

    const totalMarksSoFar = questions.rows.reduce((s, r) => s + Number(r.marks), 0);

    res.json({ mainTest, questions: questions.rows, totalMarksSoFar });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching main test" });
  }
}

async function adminAddQuestion(req, res) {
  try {
    const mainTestId = Number(req.params.mainTestId);
    if (!Number.isInteger(mainTestId)) return res.status(400).json({ error: "Invalid main test id" });

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "pending_review") {
      return res.status(400).json({ error: "Questions can only be edited while the main test is pending review" });
    }

    const { questionText, optionA, optionB, optionC, optionD, correctOption, marks } = req.body;
    if (!questionText || !optionA || !optionB || !optionC || !optionD || !correctOption || marks === undefined) {
      return res.status(400).json({ error: "questionText, optionA-D, correctOption and marks are required" });
    }

    const v = validateOptionAndMarks(correctOption, marks);
    if (v.error) return res.status(400).json({ error: v.error });

    const result = await pool.query(
      `INSERT INTO main_test_questions
       (main_test_id, question_text, option_a, option_b, option_c, option_d, correct_option, marks, added_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, question_text, option_a, option_b, option_c, option_d, correct_option, marks`,
      [mainTestId, questionText, optionA, optionB, optionC, optionD, v.opt, v.marksNum, req.user.userId]
    );

    await pool.query(
      `UPDATE main_tests SET total_questions = (SELECT COUNT(*) FROM main_test_questions WHERE main_test_id = $1) WHERE id = $1`,
      [mainTestId]
    );

    res.status(201).json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while adding question" });
  }
}

async function adminUpdateQuestion(req, res) {
  try {
    const mainTestId = Number(req.params.mainTestId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(mainTestId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "pending_review") {
      return res.status(400).json({ error: "Questions can only be edited while the main test is pending review" });
    }

    const existing = await pool.query(
      `SELECT * FROM main_test_questions WHERE id = $1 AND main_test_id = $2`,
      [questionId, mainTestId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: "Question not found" });
    const current = existing.rows[0];

    const { questionText, optionA, optionB, optionC, optionD, correctOption, marks } = req.body;

    const newText = questionText ?? current.question_text;
    const newA = optionA ?? current.option_a;
    const newB = optionB ?? current.option_b;
    const newC = optionC ?? current.option_c;
    const newD = optionD ?? current.option_d;
    let newCorrect = current.correct_option;
    let newMarks = current.marks;

    if (correctOption !== undefined || marks !== undefined) {
      const v = validateOptionAndMarks(correctOption ?? current.correct_option, marks ?? current.marks);
      if (v.error) return res.status(400).json({ error: v.error });
      newCorrect = v.opt;
      newMarks = v.marksNum;
    }

    const result = await pool.query(
      `UPDATE main_test_questions
       SET question_text=$1, option_a=$2, option_b=$3, option_c=$4, option_d=$5, correct_option=$6, marks=$7
       WHERE id = $8
       RETURNING id, question_text, option_a, option_b, option_c, option_d, correct_option, marks`,
      [newText, newA, newB, newC, newD, newCorrect, newMarks, questionId]
    );

    res.json({ question: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while updating question" });
  }
}

async function adminDeleteQuestion(req, res) {
  try {
    const mainTestId = Number(req.params.mainTestId);
    const questionId = Number(req.params.questionId);
    if (!Number.isInteger(mainTestId) || !Number.isInteger(questionId)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "pending_review") {
      return res.status(400).json({ error: "Questions can only be edited while the main test is pending review" });
    }

    const result = await pool.query(
      `DELETE FROM main_test_questions WHERE id = $1 AND main_test_id = $2 RETURNING id`,
      [questionId, mainTestId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Question not found" });

    await pool.query(
      `UPDATE main_tests SET total_questions = (SELECT COUNT(*) FROM main_test_questions WHERE main_test_id = $1) WHERE id = $1`,
      [mainTestId]
    );

    res.json({ message: "Question deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while deleting question" });
  }
}

async function adminScheduleMainTest(req, res) {
  try {
    const mainTestId = Number(req.params.mainTestId);
    if (!Number.isInteger(mainTestId)) return res.status(400).json({ error: "Invalid main test id" });

    const { scheduledAt, durationMinutes } = req.body;
    if (!scheduledAt || !durationMinutes) {
      return res.status(400).json({ error: "scheduledAt and durationMinutes are required" });
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid scheduledAt date" });
    }
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ error: "scheduledAt must be in the future" });
    }

    const durationNum = Number(durationMinutes);
    if (!Number.isInteger(durationNum) || durationNum <= 0) {
      return res.status(400).json({ error: "durationMinutes must be a positive integer" });
    }

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    if (!["pending_review", "scheduled"].includes(mainTest.status)) {
      return res.status(400).json({
        error: "Only a main test that is pending review or already scheduled can be scheduled/rescheduled",
        status: mainTest.status,
      });
    }

    const questions = await pool.query(
      `SELECT marks FROM main_test_questions WHERE main_test_id = $1`,
      [mainTestId]
    );
    if (questions.rows.length === 0) {
      return res.status(400).json({ error: "Cannot schedule a main test with no questions" });
    }
    const totalMarks = questions.rows.reduce((s, r) => s + Number(r.marks), 0);
    if (totalMarks !== mainTest.total_marks) {
      return res.status(400).json({
        error: `Total marks must equal ${mainTest.total_marks}. Current total is ${totalMarks}.`,
        currentTotal: totalMarks,
        required: mainTest.total_marks,
      });
    }

    const wasAlreadyScheduled = mainTest.status === "scheduled";

    const updated = await pool.query(
      `UPDATE main_tests
       SET status = 'scheduled', scheduled_at = $1, duration_minutes = $2,
           total_questions = $3, reviewed_by = $4, reviewed_at = NOW()
       WHERE id = $5
       RETURNING id, batch_id, status, scheduled_at, duration_minutes, total_questions, total_marks`,
      [scheduledDate, durationNum, questions.rows.length, req.user.userId, mainTestId]
    );

    const enrollments = await pool.query(
      `SELECT trainee_id FROM enrollments WHERE batch_id = $1`,
      [mainTest.batch_id]
    );

    const title = wasAlreadyScheduled ? "Main test rescheduled" : "Main test scheduled";
    const message = `The main test for your batch has been ${wasAlreadyScheduled ? "rescheduled" : "scheduled"} for ${scheduledDate.toLocaleString()}. Duration: ${durationNum} minutes.`;

    for (const e of enrollments.rows) {
      try {
        await createNotification(e.trainee_id, title, message, "info");
      } catch (notifyErr) {
        console.error("Failed to notify trainee of main test schedule:", notifyErr);
      }
    }

    res.json({ mainTest: updated.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while scheduling main test" });
  }
}

// ---------- TRAINEE ----------

async function traineeGetMainTest(req, res) {
  try {
    const traineeId = req.user.userId;
    const batchId = Number(req.params.batchId);
    if (!Number.isInteger(batchId)) return res.status(400).json({ error: "Invalid batch id" });

    const enrollment = await pool.query(
      `SELECT id FROM enrollments WHERE batch_id = $1 AND trainee_id = $2`,
      [batchId, traineeId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: "You are not enrolled in this batch" });
    }

    const mainTestResult = await pool.query(`SELECT * FROM main_tests WHERE batch_id = $1`, [batchId]);
    if (mainTestResult.rows.length === 0 || ["draft", "pending_review"].includes(mainTestResult.rows[0].status)) {
      return res.json({ status: "not_scheduled" });
    }

    const mainTest = mainTestResult.rows[0];
    const { opensAt, closesAt, windowStatus } = computeWindow(mainTest);

    const myAttempt = await pool.query(
      `SELECT id, started_at, submitted_at, score, total_questions, passed
       FROM main_test_attempts WHERE main_test_id = $1 AND trainee_id = $2`,
      [mainTest.id, traineeId]
    );

    res.json({
      status: mainTest.status,
      mainTestId: mainTest.id,
      scheduledAt: mainTest.scheduled_at,
      durationMinutes: mainTest.duration_minutes,
      totalMarks: mainTest.total_marks,
      totalQuestions: mainTest.total_questions,
      passPercentage: mainTest.pass_percentage,
      opensAt,
      closesAt,
      windowStatus,
      myAttempt: myAttempt.rows[0] || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error while fetching main test" });
  }
}

async function traineeStartMainTest(req, res) {
  const client = await pool.connect();
  try {
    const traineeId = req.user.userId;
    const mainTestId = Number(req.params.mainTestId);
    if (!Number.isInteger(mainTestId)) return res.status(400).json({ error: "Invalid main test id" });

    const mainTestResult = await client.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    if (mainTest.status !== "scheduled") {
      return res.status(403).json({ error: "This main test is not currently scheduled", status: mainTest.status });
    }

    const enrollment = await client.query(
      `SELECT id FROM enrollments WHERE batch_id = $1 AND trainee_id = $2`,
      [mainTest.batch_id, traineeId]
    );
    if (enrollment.rows.length === 0) {
      return res.status(403).json({ error: "You are not enrolled in this batch" });
    }

    const { opensAt, closesAt, windowStatus } = computeWindow(mainTest);

    if (windowStatus === "upcoming") {
      return res.status(403).json({ error: `The main test opens at ${opensAt.toLocaleString()}`, opensAt });
    }

    const existingAttempt = await client.query(
      `SELECT id, started_at, submitted_at FROM main_test_attempts
       WHERE main_test_id = $1 AND trainee_id = $2`,
      [mainTestId, traineeId]
    );

    if (windowStatus === "closed") {
      if (existingAttempt.rows.length > 0 && !existingAttempt.rows[0].submitted_at) {
        await client.query("BEGIN");
        const finalized = await finalizeMainTestAttempt(client, {
          attemptId: existingAttempt.rows[0].id,
          totalMarks: mainTest.total_marks,
          passPercentage: mainTest.pass_percentage,
          answers: [],
        });
        await client.query("COMMIT");

        try {
          await createNotification(
            traineeId,
            "Main test window closed",
            `The main test window closed before you submitted. It was auto-submitted with a score of ${finalized.score}/${mainTest.total_marks}.`,
            "warning"
          );
        } catch (e) {}

        return res.status(409).json({
          error: "The main test window closed before you submitted. It has been auto-submitted.",
          expired: true,
          score: finalized.score,
          totalMarks: mainTest.total_marks,
          passed: finalized.passed,
        });
      }
      return res.status(403).json({ error: "The main test window has closed", closesAt });
    }

    // windowStatus === "open"
    if (existingAttempt.rows.length > 0 && existingAttempt.rows[0].submitted_at) {
      return res.status(400).json({ error: "You have already submitted this main test" });
    }

    let attemptId;
    let startedAt;

    if (existingAttempt.rows.length > 0) {
      attemptId = existingAttempt.rows[0].id;
      startedAt = existingAttempt.rows[0].started_at;
    } else {
      await client.query("BEGIN");
      const attemptResult = await client.query(
        `INSERT INTO main_test_attempts (main_test_id, trainee_id, total_questions)
         VALUES ($1, $2, $3)
         RETURNING id, started_at`,
        [mainTestId, traineeId, mainTest.total_questions]
      );
      attemptId = attemptResult.rows[0].id;
      startedAt = attemptResult.rows[0].started_at;

      const questions = await client.query(
        `SELECT id FROM main_test_questions WHERE main_test_id = $1 ORDER BY id`,
        [mainTestId]
      );

      for (const q of questions.rows) {
        await client.query(
          `INSERT INTO main_test_attempt_questions (attempt_id, question_id, option_order)
           VALUES ($1, $2, $3)`,
          [attemptId, q.id, JSON.stringify(["A", "B", "C", "D"])]
        );
      }

      await client.query("COMMIT");
    }

    const questionsResult = await client.query(
      `SELECT atq.question_id, q.question_text, q.option_a, q.option_b, q.option_c, q.option_d, q.marks
       FROM main_test_attempt_questions atq
       JOIN main_test_questions q ON q.id = atq.question_id
       WHERE atq.attempt_id = $1
       ORDER BY atq.question_id`,
      [attemptId]
    );

    const questions = questionsResult.rows.map((q) => ({
      id: q.question_id,
      questionText: q.question_text,
      options: [
        { key: "A", text: q.option_a },
        { key: "B", text: q.option_b },
        { key: "C", text: q.option_c },
        { key: "D", text: q.option_d },
      ],
      marks: q.marks,
    }));

    res.status(200).json({
      attemptId,
      startedAt,
      closesAt,
      remainingSeconds: Math.floor((closesAt.getTime() - Date.now()) / 1000),
      totalMarks: mainTest.total_marks,
      questions,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: "Server error while starting main test" });
  } finally {
    client.release();
  }
}

async function traineeSubmitMainTest(req, res) {
  const client = await pool.connect();
  try {
    const traineeId = req.user.userId;
    const mainTestId = Number(req.params.mainTestId);
    const { attemptId, answers } = req.body;

    if (!Number.isInteger(mainTestId)) return res.status(400).json({ error: "Invalid main test id" });
    if (!attemptId || !Array.isArray(answers)) {
      return res.status(400).json({ error: "attemptId and answers are required" });
    }

    const mainTestResult = await client.query(`SELECT * FROM main_tests WHERE id = $1`, [mainTestId]);
    if (mainTestResult.rows.length === 0) return res.status(404).json({ error: "Main test not found" });
    const mainTest = mainTestResult.rows[0];

    const attemptResult = await client.query(
      `SELECT id, submitted_at FROM main_test_attempts
       WHERE id = $1 AND main_test_id = $2 AND trainee_id = $3`,
      [attemptId, mainTestId, traineeId]
    );
    if (attemptResult.rows.length === 0) return res.status(404).json({ error: "Attempt not found" });
    if (attemptResult.rows[0].submitted_at) {
      return res.status(400).json({ error: "This attempt has already been submitted" });
    }

    await client.query("BEGIN");

    const finalized = await finalizeMainTestAttempt(client, {
      attemptId,
      totalMarks: mainTest.total_marks,
      passPercentage: mainTest.pass_percentage,
      answers,
    });

    await client.query("COMMIT");

    if (finalized.passed) {
      await createNotification(
        traineeId,
        "Main test passed",
        `You scored ${finalized.score}/${mainTest.total_marks} on the main test.`,
        "success"
      );
    } else {
      await createNotification(
        traineeId,
        "Main test submitted",
        `You scored ${finalized.score}/${mainTest.total_marks} on the main test, below the passing threshold.`,
        "warning"
      );
    }

    let certificate = null;
    try {
      certificate = await checkMainTestCertificate(traineeId, mainTest, finalized);
    } catch (certErr) {
      console.error("Certificate generation failed:", certErr);
    }

    if (certificate) {
      try {
        await createNotification(
          traineeId,
          "Certificate issued!",
          "Congratulations! You have earned a certificate based on your combined weekly and main test performance.",
          "success"
        );
      } catch (e) {}
    }

    res.json({
      score: finalized.score,
      totalMarks: mainTest.total_marks,
      passed: finalized.passed,
      certificate,
    });
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (e) {}
    console.error(err);
    res.status(500).json({ error: "Server error while submitting main test" });
  } finally {
    client.release();
  }
}

module.exports = {
  trainerAddQuestions,
  trainerListQuestions,
  trainerUpdateQuestion,
  trainerDeleteQuestion,
  trainerSubmitMainTest,
  trainerGetStatus,
  adminListPending,
  adminGetMainTest,
  adminAddQuestion,
  adminUpdateQuestion,
  adminDeleteQuestion,
  adminScheduleMainTest,
  traineeGetMainTest,
  traineeStartMainTest,
  traineeSubmitMainTest,
};

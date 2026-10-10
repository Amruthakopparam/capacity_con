const pool = require("../config/database");
const path = require("path");
const fs = require("fs");
const { generateCertificatePDF } = require("../utils/certificate");

const CERT_DIR = path.join(__dirname, "..", "uploads", "certificates");
const TEMPLATE_DIR = path.join(__dirname, "..", "uploads", "certificate-templates");

async function getActiveTemplate() {
  const result = await pool.query(
    `SELECT id, file_path, name_x, name_y, course_x, course_y, date_x, date_y, font_size
     FROM certificate_templates WHERE is_active = true LIMIT 1`
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    imagePath: path.join(TEMPLATE_DIR, row.file_path),
    name_x: row.name_x,
    name_y: row.name_y,
    course_x: row.course_x,
    course_y: row.course_y,
    date_x: row.date_x,
    date_y: row.date_y,
    font_size: row.font_size,
  };
}

// Shared PDF generation + DB insert. Returns existing cert if one already exists for this trainee/course.
async function issueCertificateFile(traineeId, courseId, extra = {}) {
  const existing = await pool.query(
    `SELECT id, trainee_id, course_id, issued_at, file_path
     FROM certificates WHERE trainee_id = $1 AND course_id = $2`,
    [traineeId, courseId]
  );
  if (existing.rows.length > 0) return existing.rows[0];

  const traineeResult = await pool.query("SELECT name FROM users WHERE id = $1", [traineeId]);
  const courseResult = await pool.query(
    `SELECT c.title, sf.name AS field_name
     FROM courses c LEFT JOIN skill_fields sf ON sf.id = c.field_id
     WHERE c.id = $1`,
    [courseId]
  );

  if (traineeResult.rows.length === 0 || courseResult.rows.length === 0) return null;

  fs.mkdirSync(CERT_DIR, { recursive: true });

  const fileName = `certificate-${traineeId}-${courseId}-${Date.now()}.pdf`;
  const filePath = path.join(CERT_DIR, fileName);
  const issuedAt = new Date();

  const template = await getActiveTemplate();

  await generateCertificatePDF({
    traineeName: traineeResult.rows[0].name,
    courseTitle: courseResult.rows[0].title,
    fieldName: courseResult.rows[0].field_name,
    issuedAt,
    filePath,
    template,
  });

  const insertResult = await pool.query(
    `INSERT INTO certificates (trainee_id, course_id, issued_at, file_path, batch_id, main_test_attempt_id, template_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, trainee_id, course_id, issued_at, file_path`,
    [
      traineeId,
      courseId,
      issuedAt,
      fileName,
      extra.batchId || null,
      extra.mainTestAttemptId || null,
      template ? template.id : null,
    ]
  );

  return insertResult.rows[0];
}

// New eligibility formula: 0.20 * weekly-assessment-average + 0.80 * main-test-score, threshold 70%.
// Skipped/unattempted weekly assessments count as 0%.
async function checkMainTestCertificate(traineeId, mainTest, attempt) {
  const batchResult = await pool.query("SELECT course_id FROM batches WHERE id = $1", [mainTest.batch_id]);
  if (batchResult.rows.length === 0) return null;
  const courseId = batchResult.rows[0].course_id;

  const assessments = await pool.query("SELECT id FROM assessments WHERE course_id = $1", [courseId]);

  let weeklyAvg = 0;
  if (assessments.rows.length > 0) {
    let totalPct = 0;
    for (const a of assessments.rows) {
      const attemptResult = await pool.query(
        `SELECT at.score,
                (SELECT COALESCE(SUM(q.marks), 0)
                 FROM attempt_questions aq
                 JOIN questions q ON q.id = aq.question_id
                 WHERE aq.attempt_id = at.id) AS max_marks
         FROM attempts at
         WHERE at.trainee_id = $1 AND at.assessment_id = $2 AND at.submitted_at IS NOT NULL
         ORDER BY at.started_at DESC
         LIMIT 1`,
        [traineeId, a.id]
      );

      if (attemptResult.rows.length === 0) continue; // counts as 0%

      const { score, max_marks } = attemptResult.rows[0];
      const maxMarks = Number(max_marks);
      totalPct += maxMarks === 0 ? 0 : (Number(score) / maxMarks) * 100;
    }
    weeklyAvg = totalPct / assessments.rows.length;
  }

  const mainTestPct = (Number(attempt.score) / Number(mainTest.total_marks)) * 100;
  const blended = 0.2 * weeklyAvg + 0.8 * mainTestPct;

  if (blended < 70) return null;

  return issueCertificateFile(traineeId, courseId, {
    batchId: mainTest.batch_id,
    mainTestAttemptId: attempt.id,
  });
}

async function listMyCertificates(req, res) {
  try {
    const result = await pool.query(
      `SELECT cert.id, cert.course_id, c.title AS course_title, cert.issued_at
       FROM certificates cert
       JOIN courses c ON c.id = cert.course_id
       WHERE cert.trainee_id = $1
       ORDER BY cert.issued_at DESC`,
      [req.user.userId]
    );
    res.json({ certificates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error fetching certificates" });
  }
}

async function downloadCertificate(req, res) {
  try {
    const certId = Number(req.params.id);
    if (!Number.isInteger(certId)) {
      return res.status(400).json({ error: "Invalid certificate id" });
    }

    const result = await pool.query(
      "SELECT trainee_id, file_path FROM certificates WHERE id = $1",
      [certId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Certificate not found" });
    }

    const cert = result.rows[0];

    if (cert.trainee_id !== req.user.userId) {
      return res.status(403).json({ error: "You cannot access this certificate" });
    }

    const filePath = path.join(CERT_DIR, cert.file_path);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Certificate file missing on server" });
    }

    res.download(filePath, "certificate.pdf");
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error downloading certificate" });
  }
}

module.exports = {
  issueCertificateFile,
  checkMainTestCertificate,
  listMyCertificates,
  downloadCertificate,
};

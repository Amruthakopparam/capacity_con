const pool = require("../config/database");
const path = require("path");
const fs = require("fs");
const { generateCertificatePDF } = require("../utils/certificate");

const PASS_RATIO = 0.7;
const CERT_DIR = path.join(__dirname, "..", "uploads", "certificates");

// Checks if a trainee has passed every assessment in a course.
// If so, issues a certificate (or returns the existing one). Otherwise returns null.
async function checkAndIssueCertificate(traineeId, courseId) {
  const assessments = await pool.query(
    "SELECT id FROM assessments WHERE course_id = $1",
    [courseId]
  );

  if (assessments.rows.length === 0) return null;

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

    if (attemptResult.rows.length === 0) return null;

    const { score, max_marks } = attemptResult.rows[0];
    const maxMarks = Number(max_marks);

    if (maxMarks === 0 || Number(score) / maxMarks < PASS_RATIO) {
      return null;
    }
  }

  const existing = await pool.query(
    `SELECT id, trainee_id, course_id, issued_at, file_path
     FROM certificates WHERE trainee_id = $1 AND course_id = $2`,
    [traineeId, courseId]
  );

  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

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

  await generateCertificatePDF({
    traineeName: traineeResult.rows[0].name,
    courseTitle: courseResult.rows[0].title,
    fieldName: courseResult.rows[0].field_name,
    issuedAt,
    filePath,
  });

  const insertResult = await pool.query(
    `INSERT INTO certificates (trainee_id, course_id, issued_at, file_path)
     VALUES ($1, $2, $3, $4)
     RETURNING id, trainee_id, course_id, issued_at, file_path`,
    [traineeId, courseId, issuedAt, fileName]
  );

  return insertResult.rows[0];
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

module.exports = { checkAndIssueCertificate, listMyCertificates, downloadCertificate };

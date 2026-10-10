// Usage: node backend/scripts/reissue-certificate.js <traineeId> <mainTestId>
// One-off testing/ops utility: deletes any existing certificate for the
// trainee/course pair derived from the given main test, then re-runs the
// blended-formula eligibility check and reissues (useful after changing
// the active certificate template, to regenerate an existing cert with
// the new design).

require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const pool = require("../config/database");
const { checkMainTestCertificate } = require("../controllers/certificates.controller");

async function main() {
  const traineeId = Number(process.argv[2]);
  const mainTestId = Number(process.argv[3]);

  if (!Number.isInteger(traineeId) || !Number.isInteger(mainTestId)) {
    console.error("Usage: node backend/scripts/reissue-certificate.js <traineeId> <mainTestId>");
    process.exit(1);
  }

  const mainTestResult = await pool.query("SELECT * FROM main_tests WHERE id = $1", [mainTestId]);
  if (mainTestResult.rows.length === 0) {
    console.error("Main test not found");
    process.exit(1);
  }
  const mainTest = mainTestResult.rows[0];

  const attemptResult = await pool.query(
    "SELECT * FROM main_test_attempts WHERE main_test_id = $1 AND trainee_id = $2",
    [mainTestId, traineeId]
  );
  if (attemptResult.rows.length === 0) {
    console.error("No attempt found for this trainee on this main test");
    process.exit(1);
  }
  const attempt = attemptResult.rows[0];

  const batchResult = await pool.query("SELECT course_id FROM batches WHERE id = $1", [mainTest.batch_id]);
  const courseId = batchResult.rows[0].course_id;

  await pool.query("DELETE FROM certificates WHERE trainee_id = $1 AND course_id = $2", [traineeId, courseId]);
  console.log(`Deleted any existing certificate for trainee ${traineeId} / course ${courseId}`);

  const cert = await checkMainTestCertificate(traineeId, mainTest, attempt);
  console.log("Reissue result:", cert);

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

const express = require("express");
const router = express.Router();

const {
  createAssessment,
  startAssessment,
  submitAssessment,
  listAssessmentsForCourse,
} = require("../controllers/assessments.controller");

const { verifyToken, requireRole } = require("../middleware/auth");

router.post("/", verifyToken, requireRole("trainer"), createAssessment);

router.get("/course/:courseId", verifyToken, listAssessmentsForCourse);
router.post("/:assessmentId/start", verifyToken, requireRole("trainee"), startAssessment);
router.post("/:assessmentId/submit", verifyToken, requireRole("trainee"), submitAssessment);

module.exports = router;

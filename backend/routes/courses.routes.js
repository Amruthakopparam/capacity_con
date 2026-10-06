const express = require("express");
const router = express.Router();

const {
  createCourse,
  getCourses,
  getMyCourses,
  getCourseById,
} = require("../controllers/courses.controller");
const { listBatchesForCoursePublic } = require("../controllers/batches.controller");
const {
  verifyToken,
  requireRole,
  requireFieldVerified,
} = require("../middleware/auth");

router.post(
  "/",
  verifyToken,
  requireRole("trainer"),
  requireFieldVerified,
  createCourse
);

router.get("/mine", verifyToken, requireRole("trainer"), getMyCourses);
router.get("/:courseId/batches", verifyToken, listBatchesForCoursePublic);
router.get("/", verifyToken, getCourses);
router.get("/:id", verifyToken, getCourseById);

module.exports = router;

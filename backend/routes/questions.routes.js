const express = require("express");
const router = express.Router();

const {
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
  listQuestionsForCourse,
} = require("../controllers/questions.controller");

const { verifyToken, requireRole } = require("../middleware/auth");

const trainerOnly = [verifyToken, requireRole("trainer")];

router.post("/", ...trainerOnly, addQuestion);
router.post("/bulk", ...trainerOnly, addQuestionsBulk);
router.get("/course/:courseId", ...trainerOnly, listQuestionsForCourse);
router.put("/:questionId", ...trainerOnly, updateQuestion);
router.delete("/:questionId", ...trainerOnly, deleteQuestion);

module.exports = router;

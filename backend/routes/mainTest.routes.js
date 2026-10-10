const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/mainTest.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// Trainer: own batch, draft-only editing
router.post("/batch/:batchId/questions", verifyToken, requireRole("trainer"), ctrl.trainerAddQuestions);
router.get("/batch/:batchId/questions", verifyToken, requireRole("trainer"), ctrl.trainerListQuestions);
router.put("/batch/:batchId/questions/:questionId", verifyToken, requireRole("trainer"), ctrl.trainerUpdateQuestion);
router.delete("/batch/:batchId/questions/:questionId", verifyToken, requireRole("trainer"), ctrl.trainerDeleteQuestion);
router.post("/batch/:batchId/submit", verifyToken, requireRole("trainer"), ctrl.trainerSubmitMainTest);
router.get("/batch/:batchId/trainer-status", verifyToken, requireRole("trainer"), ctrl.trainerGetStatus);

// Trainee
router.get("/batch/:batchId", verifyToken, requireRole("trainee"), ctrl.traineeGetMainTest);
router.post("/:mainTestId/start", verifyToken, requireRole("trainee"), ctrl.traineeStartMainTest);
router.post("/:mainTestId/submit", verifyToken, requireRole("trainee"), ctrl.traineeSubmitMainTest);

module.exports = router;

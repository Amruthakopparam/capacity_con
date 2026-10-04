const express = require("express");
const router = express.Router();

const {
  getMyFieldsStatus,
  startTest,
  submitTest,
} = require("../controllers/skillTest.controller");

const { verifyToken, requireRole } = require("../middleware/auth");

const trainerOnly = [verifyToken, requireRole("trainer")];

router.get("/fields", ...trainerOnly, getMyFieldsStatus);
router.post("/:fieldId/start", ...trainerOnly, startTest);
router.post("/attempts/:attemptId/submit", ...trainerOnly, submitTest);

module.exports = router;

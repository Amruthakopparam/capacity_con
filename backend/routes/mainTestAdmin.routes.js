const express = require("express");
const router = express.Router();

const ctrl = require("../controllers/mainTest.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

router.get("/pending", verifyToken, requireRole("admin"), ctrl.adminListPending);
router.get("/:mainTestId", verifyToken, requireRole("admin"), ctrl.adminGetMainTest);
router.post("/:mainTestId/questions", verifyToken, requireRole("admin"), ctrl.adminAddQuestion);
router.put("/:mainTestId/questions/:questionId", verifyToken, requireRole("admin"), ctrl.adminUpdateQuestion);
router.delete("/:mainTestId/questions/:questionId", verifyToken, requireRole("admin"), ctrl.adminDeleteQuestion);
router.post("/:mainTestId/schedule", verifyToken, requireRole("admin"), ctrl.adminScheduleMainTest);

module.exports = router;

const express = require("express");
const router = express.Router();

const { addResource, getResources } = require("../controllers/learningResources.controller");
const {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
} = require("../middleware/auth");

router.post(
  "/",
  verifyToken,
  requireRole("trainer"),
  requireVerifiedTrainer,
  addResource
);

router.get("/:courseId", verifyToken, getResources);

module.exports = router;

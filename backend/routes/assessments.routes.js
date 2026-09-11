const express = require('express');
const router = express.Router();

const {
  createAssessment,
} = require('../controllers/assessments.controller');

const { verifyToken, requireRole } = require('../middleware/auth');

// Create an assessment — only logged-in trainers can do this
router.post('/', verifyToken, requireRole('trainer'), createAssessment);

module.exports = router;

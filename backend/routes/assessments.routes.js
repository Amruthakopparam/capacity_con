const express = require('express');
const router = express.Router();

const {
  createAssessment,
  startAssessment,
  submitAssessment,
} = require('../controllers/assessments.controller');

const { verifyToken, requireRole } = require('../middleware/auth');

// Create an assessment — only logged-in trainers can do this
router.post('/', verifyToken, requireRole('trainer'), createAssessment);
router.post('/:assessmentId/start', verifyToken, requireRole('trainee'), startAssessment);
router.post('/:assessmentId/submit', verifyToken, requireRole('trainee'), submitAssessment);

module.exports = router;

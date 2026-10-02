const express = require('express');
const router = express.Router();

const {
  createAssessment,
  startAssessment,
  submitAssessment,
} = require('../controllers/assessments.controller');

const {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
} = require('../middleware/auth');

// Create an assessment: only verified trainers can do this
router.post(
  '/',
  verifyToken,
  requireRole('trainer'),
  requireVerifiedTrainer,
  createAssessment
);

// Trainees take assessments (no trainer verification needed)
router.post('/:assessmentId/start', verifyToken, requireRole('trainee'), startAssessment);
router.post('/:assessmentId/submit', verifyToken, requireRole('trainee'), submitAssessment);

module.exports = router;
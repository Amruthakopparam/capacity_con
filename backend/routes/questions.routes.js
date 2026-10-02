const express = require('express');
const router = express.Router();

const {
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/questions.controller');

const {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
} = require('../middleware/auth');

// Question management: only verified trainers
const trainerOnly = [verifyToken, requireRole('trainer'), requireVerifiedTrainer];

router.post('/', ...trainerOnly, addQuestion);
router.post('/bulk', ...trainerOnly, addQuestionsBulk);
router.put('/:questionId', ...trainerOnly, updateQuestion);
router.delete('/:questionId', ...trainerOnly, deleteQuestion);

module.exports = router;
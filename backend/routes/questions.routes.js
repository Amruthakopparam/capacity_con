const express = require('express');
const router = express.Router();

const {
  addQuestion,
  addQuestionsBulk,
  updateQuestion,
  deleteQuestion,
} = require('../controllers/questions.controller');

const { verifyToken, requireRole } = require('../middleware/auth');

// Add a question — only logged-in trainers can do this
router.post('/', verifyToken, requireRole('trainer'), addQuestion);
router.post('/bulk', verifyToken, requireRole('trainer'), addQuestionsBulk);
router.put('/:questionId', verifyToken, requireRole('trainer'), updateQuestion);
router.delete('/:questionId', verifyToken, requireRole('trainer'), deleteQuestion);

module.exports = router;
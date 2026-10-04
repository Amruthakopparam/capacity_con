const express = require('express');
const router = express.Router();

const {
  listTrainers,
  getTrainerDetail,
  approveTrainer,
  rejectTrainer,
} = require('../controllers/admin.controller');

const {
  listSkillTestQuestions,
  addSkillTestQuestion,
  addSkillTestQuestionsBulk,
  updateSkillTestQuestion,
  deleteSkillTestQuestion,
} = require('../controllers/skillTestQuestions.controller');

const { verifyToken, requireRole } = require('../middleware/auth');

// Every route here is admin-only
router.use(verifyToken, requireRole('admin'));

router.get('/trainers', listTrainers);
router.get('/trainers/:id', getTrainerDetail);
router.post('/trainers/:id/approve', approveTrainer);
router.post('/trainers/:id/reject', rejectTrainer);

// Skill test question management
router.get('/skill-fields/:fieldId/questions', listSkillTestQuestions);
router.post('/skill-fields/:fieldId/questions', addSkillTestQuestion);
router.post('/skill-fields/:fieldId/questions/bulk', addSkillTestQuestionsBulk);
router.put('/skill-test-questions/:questionId', updateSkillTestQuestion);
router.delete('/skill-test-questions/:questionId', deleteSkillTestQuestion);

module.exports = router;
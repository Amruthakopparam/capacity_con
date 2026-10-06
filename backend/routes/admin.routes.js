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

const {
  createBatch,
  listBatchesForCourseAdmin,
  updateBatch,
} = require('../controllers/batches.controller');

const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('admin'));

router.get('/trainers', listTrainers);
router.get('/trainers/:id', getTrainerDetail);
router.post('/trainers/:id/approve', approveTrainer);
router.post('/trainers/:id/reject', rejectTrainer);

router.get('/skill-fields/:fieldId/questions', listSkillTestQuestions);
router.post('/skill-fields/:fieldId/questions', addSkillTestQuestion);
router.post('/skill-fields/:fieldId/questions/bulk', addSkillTestQuestionsBulk);
router.put('/skill-test-questions/:questionId', updateSkillTestQuestion);
router.delete('/skill-test-questions/:questionId', deleteSkillTestQuestion);

router.post('/courses/:courseId/batches', createBatch);
router.get('/courses/:courseId/batches', listBatchesForCourseAdmin);
router.put('/batches/:batchId', updateBatch);

module.exports = router;

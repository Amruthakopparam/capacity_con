const express = require('express');
const router = express.Router();

const {
  listTrainers,
  getTrainerDetail,
  approveTrainer,
  rejectTrainer,
} = require('../controllers/admin.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Every route here is admin-only
router.use(verifyToken, requireRole('admin'));

router.get('/trainers', listTrainers);
router.get('/trainers/:id', getTrainerDetail);
router.post('/trainers/:id/approve', approveTrainer);
router.post('/trainers/:id/reject', rejectTrainer);

module.exports = router;
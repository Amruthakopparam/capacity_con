const express = require('express');
const router = express.Router();

const { addResource } = require('../controllers/learningResources.controller');
const {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
} = require('../middleware/auth');

// Add a learning resource: only verified trainers can do this
router.post(
  '/',
  verifyToken,
  requireRole('trainer'),
  requireVerifiedTrainer,
  addResource
);

module.exports = router;
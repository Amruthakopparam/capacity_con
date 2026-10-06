const express = require('express');
const router = express.Router();

const {
  getProfile,
  setFields,
  addExperience,
  updateExperience,
  deleteExperience,
  submitForReview,
  getCompetency,
} = require('../controllers/trainerProfile.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken, requireRole('trainer'));

router.get('/profile', getProfile);
router.put('/fields', setFields);
router.post('/experiences', addExperience);
router.put('/experiences/:id', updateExperience);
router.delete('/experiences/:id', deleteExperience);
router.post('/submit', submitForReview);
router.get('/competency', getCompetency);

module.exports = router;

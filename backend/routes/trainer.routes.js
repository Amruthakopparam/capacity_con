const express = require('express');
const router = express.Router();

const {
  getProfile,
  setFields,
  addExperience,
  updateExperience,
  deleteExperience,
} = require('../controllers/trainerProfile.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Every route here is for logged-in trainers.
// There is no requireVerifiedTrainer, because unverified trainers
// must be able to fill in their onboarding details.
router.use(verifyToken, requireRole('trainer'));

router.get('/profile', getProfile);
router.put('/fields', setFields);
router.post('/experiences', addExperience);
router.put('/experiences/:id', updateExperience);
router.delete('/experiences/:id', deleteExperience);

module.exports = router;
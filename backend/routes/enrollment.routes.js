const express = require('express');
const router = express.Router();

const { enrollInCourse, getMyEnrollments } = require('../controllers/enrollment.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Enroll in a course â€” only logged-in trainees can do this
router.post('/', verifyToken, requireRole('trainee'), enrollInCourse);
router.get('/my', verifyToken, requireRole('trainee'), getMyEnrollments);

module.exports = router;


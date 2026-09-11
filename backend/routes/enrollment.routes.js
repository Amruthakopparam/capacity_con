const express = require('express');
const router = express.Router();

const { enrollInCourse } = require('../controllers/enrollment.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Enroll in a course — only logged-in trainees can do this
router.post('/', verifyToken, requireRole('trainee'), enrollInCourse);

module.exports = router;

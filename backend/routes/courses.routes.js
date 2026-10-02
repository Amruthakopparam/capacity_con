const express = require('express');
const router = express.Router();

const { createCourse, getCourses } = require('../controllers/courses.controller');
const {
  verifyToken,
  requireRole,
  requireVerifiedTrainer,
} = require('../middleware/auth');

// Create a course: only verified trainers can do this
router.post(
  '/',
  verifyToken,
  requireRole('trainer'),
  requireVerifiedTrainer,
  createCourse
);

// Get all courses
router.get('/', verifyToken, getCourses);

module.exports = router;
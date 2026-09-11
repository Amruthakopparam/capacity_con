const express = require('express');
const router = express.Router();

const { createCourse, getCourses } = require('../controllers/courses.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Create a course — only logged-in trainers can do this
router.post('/', verifyToken, requireRole('trainer'), createCourse);
// Get all courses
router.get('/', verifyToken, getCourses);
module.exports = router;

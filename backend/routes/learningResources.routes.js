const express = require('express');
const router = express.Router();

const { addResource } = require('../controllers/learningResources.controller');
const { verifyToken, requireRole } = require('../middleware/auth');

// Add a learning resource — only logged-in trainers can do this
router.post('/', verifyToken, requireRole('trainer'), addResource);

module.exports = router;
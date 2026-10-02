const express = require('express');
const router = express.Router();

const { listSkillFields } = require('../controllers/trainerProfile.controller');
const { verifyToken } = require('../middleware/auth');

router.get('/', verifyToken, listSkillFields);

module.exports = router;
console.log('DOCUMENTS ROUTES LOADED');
const express = require('express');

const router = express.Router();

const { verifyToken, requireRole } = require('../middleware/auth');

router.get(
  '/my-documents',
  verifyToken,
  requireRole('trainee', 'trainer'),
  async (req, res) => {
    res.json({
      message: 'My documents endpoint is working',
      userId: req.user.id,
    });
  }
);

module.exports = router;
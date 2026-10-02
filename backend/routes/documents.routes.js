console.log('DOCUMENTS ROUTES LOADED');

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const pool = require('../config/database');
const { verifyToken, requireRole } = require('../middleware/auth');

const router = express.Router();

/*
  ---------------------------------------------------------
  UPLOAD DIRECTORY
  ---------------------------------------------------------
*/

const uploadDirectory = path.join(__dirname, '..', 'uploads');

// Create uploads folder automatically if it does not exist
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

/*
  ---------------------------------------------------------
  MULTER STORAGE
  ---------------------------------------------------------
*/

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + '-' + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

/*
  ---------------------------------------------------------
  FILE VALIDATION
  ---------------------------------------------------------
*/

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new Error('Only PDF, JPG, and PNG files are allowed')
      );
    }

    cb(null, true);
  },
});

/*
  ---------------------------------------------------------
  UPLOAD DOCUMENT
  ---------------------------------------------------------
*/

router.post(
  '/upload',
  verifyToken,
  requireRole('trainee', 'trainer'),
  upload.single('document'),

  async (req, res) => {
    try {
      /*
        Check that a file was uploaded
      */

      if (!req.file) {
        return res.status(400).json({
          error: 'No document uploaded',
        });
      }

      /*
        Get document type
      */

      const { document_type } = req.body;

      if (!document_type) {
        // Delete uploaded file if document type was missing
        fs.unlinkSync(req.file.path);

        return res.status(400).json({
          error: 'Document type is required',
        });
      }

      /*
        Get user ID from JWT

        Different JWT implementations sometimes use:
        id
        userId
        user_id

        We support all three here.
      */

      const userId =
        req.user.id ||
        req.user.userId ||
        req.user.user_id;

      if (!userId) {
        console.error('JWT user information:', req.user);

        fs.unlinkSync(req.file.path);

        return res.status(401).json({
          error: 'User ID not found in authentication token',
        });
      }

      /*
        File path saved in database
      */

      const fileUrl = path.relative(
        path.join(__dirname, '..'),
        req.file.path
      );

      /*
        Save document information in PostgreSQL
      */

      const result = await pool.query(
        `INSERT INTO documents
          (user_id, document_type, file_url, verification_status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING
          id,
          user_id,
          document_type,
          file_url,
          verification_status,
          uploaded_at`,
        [
          userId,
          document_type,
          fileUrl,
        ]
      );

      /*
        Successful response
      */

      res.status(201).json({
        message: 'Document uploaded successfully',

        document: result.rows[0],
      });

    } catch (error) {

      console.error(
        'Document upload error:',
        error.message
      );

      /*
        If database insertion fails after the file
        was uploaded, remove the orphaned file.
      */

      if (req.file && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (deleteError) {
          console.error(
            'Failed to delete uploaded file:',
            deleteError.message
          );
        }
      }

      res.status(500).json({
        error: 'Document upload failed',
        details: error.message,
      });
    }
  }
);

/*
  ---------------------------------------------------------
  GET CURRENT USER'S DOCUMENTS
  ---------------------------------------------------------
*/

router.get(
  '/my-documents',
  verifyToken,
  requireRole('trainee', 'trainer'),

  async (req, res) => {
    try {

      const userId =
        req.user.id ||
        req.user.userId ||
        req.user.user_id;

        console.log('Authenticated user:', req.user);
        console.log('Using user ID:', userId);

      if (!userId) {
        return res.status(401).json({
          error: 'User ID not found in authentication token',
        });
      }

      const result = await pool.query(
        `SELECT
          id,
          document_type,
          file_url,
          verification_status,
          ocr_name,
          ocr_dob,
          rejection_reason,
          uploaded_at,
          verified_at
         FROM documents
         WHERE user_id = $1
         ORDER BY uploaded_at DESC`,
        [userId]
      );

      res.json({
        documents: result.rows,
      });

    } catch (error) {

      console.error(
        'Get documents error:',
        error.message
      );

      res.status(500).json({
        error: 'Failed to fetch documents',
        details: error.message,
      });
    }
  }
);

/*
  ---------------------------------------------------------
  EXPORT ROUTER
  ---------------------------------------------------------
*/

module.exports = router;
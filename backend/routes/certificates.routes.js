const express = require("express");
const router = express.Router();
const { verifyToken, requireRole } = require("../middleware/auth");
const { listMyCertificates, downloadCertificate } = require("../controllers/certificates.controller");

router.get("/my", verifyToken, requireRole("trainee"), listMyCertificates);
router.get("/:id/download", verifyToken, requireRole("trainee"), downloadCertificate);

module.exports = router;

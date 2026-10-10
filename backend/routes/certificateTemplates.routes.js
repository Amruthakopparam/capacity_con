const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { verifyToken, requireRole } = require("../middleware/auth");
const {
  uploadTemplate,
  listTemplates,
  activateTemplate,
  deleteTemplate,
} = require("../controllers/certificateTemplates.controller");

const router = express.Router();

const TEMPLATE_DIR = path.join(__dirname, "..", "uploads", "certificate-templates");
if (!fs.existsSync(TEMPLATE_DIR)) {
  fs.mkdirSync(TEMPLATE_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TEMPLATE_DIR),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPG and PNG images are allowed for certificate templates"));
    }
    cb(null, true);
  },
});

router.post("/", verifyToken, requireRole("admin"), upload.single("template"), uploadTemplate);
router.get("/", verifyToken, requireRole("admin"), listTemplates);
router.put("/:id/activate", verifyToken, requireRole("admin"), activateTemplate);
router.delete("/:id", verifyToken, requireRole("admin"), deleteTemplate);

module.exports = router;

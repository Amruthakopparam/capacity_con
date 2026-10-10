const pool = require("../config/database");
const path = require("path");
const fs = require("fs");

const TEMPLATE_DIR = path.join(__dirname, "..", "uploads", "certificate-templates");
fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

async function uploadTemplate(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No template image uploaded" });
    }

    const { name, name_x, name_y, course_x, course_y, date_x, date_y, font_size } = req.body;

    if (!name) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Template name is required" });
    }

    const requiredCoords = { name_x, name_y, course_x, course_y, date_x, date_y };
    for (const [key, value] of Object.entries(requiredCoords)) {
      if (value === undefined || value === null || value === "" || isNaN(Number(value))) {
        fs.unlinkSync(req.file.path);
        return res.status(400).json({ error: `Missing or invalid coordinate: ${key}` });
      }
    }

    const result = await pool.query(
      `INSERT INTO certificate_templates
        (name, file_path, is_active, name_x, name_y, course_x, course_y, date_x, date_y, font_size)
       VALUES ($1, $2, false, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        name,
        req.file.filename,
        Number(name_x),
        Number(name_y),
        Number(course_x),
        Number(course_y),
        Number(date_x),
        Number(date_y),
        font_size ? Number(font_size) : 24,
      ]
    );

    res.status(201).json({ template: result.rows[0] });
  } catch (err) {
    console.error(err);
    if (req.file && fs.existsSync(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }
    res.status(500).json({ error: "Failed to upload certificate template" });
  }
}

async function listTemplates(req, res) {
  try {
    const result = await pool.query(
      `SELECT * FROM certificate_templates ORDER BY created_at DESC`
    );
    res.json({ templates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch certificate templates" });
  }
}

async function activateTemplate(req, res) {
  try {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      return res.status(400).json({ error: "Invalid template id" });
    }

    const existing = await pool.query("SELECT id FROM certificate_templates WHERE id = $1", [templateId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    await pool.query("UPDATE certificate_templates SET is_active = false WHERE is_active = true");
    const result = await pool.query(
      "UPDATE certificate_templates SET is_active = true WHERE id = $1 RETURNING *",
      [templateId]
    );

    res.json({ template: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to activate certificate template" });
  }
}

async function deleteTemplate(req, res) {
  try {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      return res.status(400).json({ error: "Invalid template id" });
    }

    const result = await pool.query(
      "DELETE FROM certificate_templates WHERE id = $1 RETURNING file_path",
      [templateId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const filePath = path.join(TEMPLATE_DIR, result.rows[0].file_path);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (_) {}
    }

    res.json({ message: "Template deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete certificate template" });
  }
}

module.exports = { uploadTemplate, listTemplates, activateTemplate, deleteTemplate };

const pool = require("../config/database");
const path = require("path");
const fs = require("fs");

const TEMPLATE_DIR = path.join(__dirname, "..", "uploads", "certificate-templates");
fs.mkdirSync(TEMPLATE_DIR, { recursive: true });

const VALID_FONTS = [
  "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
  "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic",
  "Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique",
  "Symbol", "ZapfDingbats",
];

const FIELDS = ["name", "course", "field", "date"];

function parseBoxFields(body) {
  const boxes = {};
  for (const field of FIELDS) {
    const x = Number(body[`${field}_x`]);
    const y = Number(body[`${field}_y`]);
    const width = Number(body[`${field}_width`]);
    const height = Number(body[`${field}_height`]);
    const rotation = body[`${field}_rotation`] !== undefined ? Number(body[`${field}_rotation`]) : 0;
    const fontSize = Number(body[`${field}_font_size`]);
    const font = body[`${field}_font`] || "Helvetica";

    if ([x, y, width, height, fontSize].some((v) => isNaN(v))) {
      return { error: `Missing or invalid numeric fields for "${field}" box` };
    }
    if (!VALID_FONTS.includes(font)) {
      return { error: `Invalid font for "${field}": ${font}` };
    }

    boxes[field] = { x, y, width, height, rotation: isNaN(rotation) ? 0 : rotation, fontSize, font };
  }
  return { boxes };
}

async function uploadTemplate(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No template image uploaded" });
    }

    const { name } = req.body;
    if (!name) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Template name is required" });
    }

    const parsed = parseBoxFields(req.body);
    if (parsed.error) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: parsed.error });
    }
    const { boxes } = parsed;

    const result = await pool.query(
      `INSERT INTO certificate_templates
        (name, file_path, is_active,
         name_x, name_y, name_width, name_height, name_rotation, name_font, name_font_size,
         course_x, course_y, course_width, course_height, course_rotation, course_font, course_font_size,
         field_x, field_y, field_width, field_height, field_rotation, field_font, field_font_size,
         date_x, date_y, date_width, date_height, date_rotation, date_font, date_font_size)
       VALUES ($1, $2, false,
         $3, $4, $5, $6, $7, $8, $9,
         $10, $11, $12, $13, $14, $15, $16,
         $17, $18, $19, $20, $21, $22, $23,
         $24, $25, $26, $27, $28, $29, $30)
       RETURNING *`,
      [
        name,
        req.file.filename,
        boxes.name.x, boxes.name.y, boxes.name.width, boxes.name.height, boxes.name.rotation, boxes.name.font, boxes.name.fontSize,
        boxes.course.x, boxes.course.y, boxes.course.width, boxes.course.height, boxes.course.rotation, boxes.course.font, boxes.course.fontSize,
        boxes.field.x, boxes.field.y, boxes.field.width, boxes.field.height, boxes.field.rotation, boxes.field.font, boxes.field.fontSize,
        boxes.date.x, boxes.date.y, boxes.date.width, boxes.date.height, boxes.date.rotation, boxes.date.font, boxes.date.fontSize,
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
    const result = await pool.query(`SELECT * FROM certificate_templates ORDER BY created_at DESC`);
    res.json({ templates: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch certificate templates" });
  }
}

async function updateTemplateLayout(req, res) {
  try {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      return res.status(400).json({ error: "Invalid template id" });
    }

    const existing = await pool.query("SELECT id FROM certificate_templates WHERE id = $1", [templateId]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const parsed = parseBoxFields(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }
    const { boxes } = parsed;

    const result = await pool.query(
      `UPDATE certificate_templates SET
         name_x=$1, name_y=$2, name_width=$3, name_height=$4, name_rotation=$5, name_font=$6, name_font_size=$7,
         course_x=$8, course_y=$9, course_width=$10, course_height=$11, course_rotation=$12, course_font=$13, course_font_size=$14,
         field_x=$15, field_y=$16, field_width=$17, field_height=$18, field_rotation=$19, field_font=$20, field_font_size=$21,
         date_x=$22, date_y=$23, date_width=$24, date_height=$25, date_rotation=$26, date_font=$27, date_font_size=$28
       WHERE id = $29
       RETURNING *`,
      [
        boxes.name.x, boxes.name.y, boxes.name.width, boxes.name.height, boxes.name.rotation, boxes.name.font, boxes.name.fontSize,
        boxes.course.x, boxes.course.y, boxes.course.width, boxes.course.height, boxes.course.rotation, boxes.course.font, boxes.course.fontSize,
        boxes.field.x, boxes.field.y, boxes.field.width, boxes.field.height, boxes.field.rotation, boxes.field.font, boxes.field.fontSize,
        boxes.date.x, boxes.date.y, boxes.date.width, boxes.date.height, boxes.date.rotation, boxes.date.font, boxes.date.fontSize,
        templateId,
      ]
    );

    res.json({ template: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update certificate template layout" });
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

    const inUse = await pool.query("SELECT id FROM certificates WHERE template_id = $1 LIMIT 1", [templateId]);
    if (inUse.rows.length > 0) {
      return res.status(409).json({ error: "Cannot delete a template that has already been used to issue certificates" });
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


async function getTemplateImage(req, res) {
  try {
    const templateId = Number(req.params.id);
    if (!Number.isInteger(templateId)) {
      return res.status(400).json({ error: "Invalid template id" });
    }

    const result = await pool.query("SELECT file_path FROM certificate_templates WHERE id = $1", [templateId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Template not found" });
    }

    const filePath = path.join(TEMPLATE_DIR, result.rows[0].file_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Template image missing on server" });
    }

    res.sendFile(filePath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load template image" });
  }
}
module.exports = {
  uploadTemplate,
  listTemplates,
  updateTemplateLayout,
  activateTemplate,
  deleteTemplate,
  VALID_FONTS,
  FIELDS,
  getTemplateImage,
};


const PDFDocument = require("pdfkit");
const fs = require("fs");

// Fixed canvas size for all certificates: A4 landscape in PDF points.
// Uploaded template images are stretched to fill this exact canvas, so
// admin-chosen coordinates are always relative to 842 x 595.
const PAGE_WIDTH = 842;
const PAGE_HEIGHT = 595;

// Draws text centered inside a box defined by its CENTER point (box.x, box.y),
// width/height, optional rotation (degrees, clockwise), font, and font size.
// Rotation pivots around the box's center.
function drawBoxedText(doc, text, box) {
  const { x, y, width, height, rotation = 0, font = "Helvetica", fontSize = 24 } = box;

  doc.save();
  doc.translate(x, y);
  if (rotation) {
    doc.rotate(rotation);
  }

  doc.font(font).fontSize(fontSize).fillColor("#000");

  doc.text(text, -width / 2, -height / 2, {
    width,
    height,
    align: "center",
    lineBreak: false,
  });

  doc.restore();
}

function generateCertificatePDF({ traineeName, courseTitle, fieldName, issuedAt, filePath, template }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_WIDTH, PAGE_HEIGHT], margin: 0 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const dateText = new Date(issuedAt).toLocaleDateString();

    if (template && template.imagePath && fs.existsSync(template.imagePath)) {
      doc.image(template.imagePath, 0, 0, { width: PAGE_WIDTH, height: PAGE_HEIGHT });

      drawBoxedText(doc, traineeName, template.name);
      drawBoxedText(doc, courseTitle, template.course);
      if (fieldName && template.field) {
        drawBoxedText(doc, `Field: ${fieldName}`, template.field);
      }
      drawBoxedText(doc, dateText, template.date);

    } else {
      doc.fontSize(10).fillColor("#888").text("Capacity Connect", 50, 40);

      doc.moveDown(2);
      doc.fontSize(28).fillColor("#1a1a1a").text("Certificate of Completion", { align: "center" });

      doc.moveDown(1.5);
      doc.fontSize(14).fillColor("#444").text("This certifies that", { align: "center" });

      doc.moveDown(0.5);
      doc.fontSize(24).fillColor("#000").text(traineeName, { align: "center" });

      doc.moveDown(0.5);
      doc.fontSize(14).fillColor("#444").text("has successfully completed the course", { align: "center" });

      doc.moveDown(0.5);
      doc.fontSize(20).fillColor("#000").text(courseTitle, { align: "center" });

      if (fieldName) {
        doc.moveDown(0.3);
        doc.fontSize(12).fillColor("#666").text(`Field: ${fieldName}`, { align: "center" });
      }

      doc.moveDown(2);
      doc.fontSize(11).fillColor("#666").text(`Issued on ${dateText}`, { align: "center" });
    }

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

module.exports = { generateCertificatePDF, PAGE_WIDTH, PAGE_HEIGHT };

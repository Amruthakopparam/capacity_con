const PDFDocument = require("pdfkit");
const fs = require("fs");

function generateCertificatePDF({ traineeName, courseTitle, fieldName, issuedAt, filePath }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ layout: "landscape", size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

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
    doc.fontSize(11).fillColor("#666").text(
      `Issued on ${new Date(issuedAt).toLocaleDateString()}`,
      { align: "center" }
    );

    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

module.exports = { generateCertificatePDF };

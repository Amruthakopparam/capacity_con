const express = require("express");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/auth.routes");
const enrollmentRoutes = require("./routes/enrollment.routes");
const coursesRoutes = require("./routes/courses.routes");
const learningResourcesRoutes = require("./routes/learningResources.routes");
const questionsRoutes = require("./routes/questions.routes");
const assessmentsRoutes = require("./routes/assessments.routes");
const documentsRoutes = require("./routes/documents.routes");
const skillFieldsRoutes = require("./routes/skillFields.routes");
const trainerRoutes = require("./routes/trainer.routes");
const adminRoutes = require("./routes/admin.routes");
const skillTestRoutes = require("./routes/skillTest.routes");
const notificationsRoutes = require("./routes/notifications.routes");
const certificatesRoutes = require("./routes/certificates.routes");
const mainTestRoutes = require("./routes/mainTest.routes");
const mainTestAdminRoutes = require("./routes/mainTestAdmin.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/learning-resources", learningResourcesRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/assessments", assessmentsRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/skill-fields", skillFieldsRoutes);
app.use("/api/trainer", trainerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/skill-test", skillTestRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/certificates", certificatesRoutes);
app.use("/api/main-tests", mainTestRoutes);
app.use("/api/admin/main-tests", mainTestAdminRoutes);

app.get("/", (req, res) => {
  res.send("Capacity Connect backend is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

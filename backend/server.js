const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const enrollmentRoutes = require('./routes/enrollment.routes');
const coursesRoutes = require('./routes/courses.routes');
const learningResourcesRoutes = require('./routes/learningResources.routes');
const questionsRoutes = require('./routes/questions.routes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/learning-resources', learningResourcesRoutes);
app.use('/api/questions', questionsRoutes);

app.get('/', (req, res) => {
  res.send('Capacity Connect backend is running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

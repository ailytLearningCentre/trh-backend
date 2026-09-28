require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const connectDB = require("./config/db");

const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const blogRoutes = require("./routes/blogRoutes");
const adminRoutes = require("./routes/adminRoutes");
const doctorRoutes = require("./routes/doctorRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

connectDB();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/prakriti", require("./routes/prakritiRoutes"));
app.use('/api/prakriti', (error, req, res, next) => {
  const malformed = error.type === 'entity.parse.failed';
  res.status(malformed ? 400 : 500).json({ success: false, message: malformed ? 'Invalid JSON request.' : 'Unable to process Prakriti request.' });
});
app.use('/api/family-members', require('./routes/familyMemberRoutes'));
app.use('/api/family-members', (error, req, res, next) => {
  res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ success: false, message: error.type === 'entity.parse.failed' ? 'Invalid JSON request.' : 'Unable to process family request.' });
});
app.use('/api/wellness', require('./routes/wellnessRoutes'));
app.use('/api/wellness', (error, req, res, next) => {
  res.status(error.type === 'entity.parse.failed' ? 400 : 500).json({ success: false, message: error.type === 'entity.parse.failed' ? 'Invalid JSON request.' : 'Unable to process plan request.' });
});
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});

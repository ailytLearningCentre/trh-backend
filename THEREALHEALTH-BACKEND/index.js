require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const authRoutes = require("./routes/authRoutes");
const appointmentRoutes = require("./routes/appointmentRoutes");
const blogRoutes = require("./routes/blogRoutes");
const adminRoutes = require("./routes/adminRoutes");
const path = require("path");

const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

connectDB();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/admin", adminRoutes);

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
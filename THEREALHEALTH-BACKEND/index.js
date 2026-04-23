const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Connect DB
connectDB();

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", userRoutes);
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/blogs", require("./routes/blogRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
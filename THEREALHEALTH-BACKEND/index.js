// Placeholder content for index.js

require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");

const PORT = process.env.PORT || 3000;

// Middleware to parse JSON
app.use(express.json());
app.use(cors());
connectDB();

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/user", userRoutes); // Register user routes
app.use("/api/appointments", require("./routes/appointmentRoutes"));
app.use("/api/blogs", require("./routes/blogRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));

const phone = "1234567890";

app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
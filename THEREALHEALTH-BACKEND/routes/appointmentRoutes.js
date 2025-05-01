// Placeholder content for appointmentRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require("../middlewares/authMiddleware");
const { bookAppointment, getAppointments } = require("../controllers/appointmentController");
const { updateAppointmentStatus } = require("../controllers/adminController");

router.post("/book", authenticateUser, bookAppointment);
router.put("/:id", authenticateAdmin, updateAppointmentStatus);

// Add this route for fetching appointments
router.get("/", authenticateUser, getAppointments);

module.exports = router;
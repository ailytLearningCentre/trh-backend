const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authenticateAdmin,
} = require("../middlewares/authMiddleware");

const {
  bookAppointment,
  getAppointments,
  getBookedSlots,
  getDoctorAppointments,
  updateDoctorAppointmentStatus,
} = require("../controllers/appointmentController");

const {
  updateAppointmentStatus,
} = require("../controllers/adminController");

// User appointment routes
router.post("/book", authenticateUser, bookAppointment);
router.get("/booked-slots", authenticateUser, getBookedSlots);
router.get("/", authenticateUser, getAppointments);

// Doctor appointment routes
router.get("/doctor/all", authenticateUser, getDoctorAppointments);
router.put(
  "/doctor/:appointmentId/status",
  authenticateUser,
  updateDoctorAppointmentStatus
);

// Admin route kept as it was
router.put("/:id", authenticateAdmin, updateAppointmentStatus);

module.exports = router;
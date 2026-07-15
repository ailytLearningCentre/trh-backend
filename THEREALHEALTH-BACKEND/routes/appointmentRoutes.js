const express = require("express");
const router = express.Router();
const {
  authenticateUser,
  authenticateAdmin,
} = require("../middlewares/authMiddleware");
const appointmentController = require("../controllers/appointmentController");
const adminController = require("../controllers/adminController");

router.post("/book", authenticateUser, appointmentController.bookAppointment);
router.post("/cancel", authenticateUser, appointmentController.cancelAppointment);
router.get("/booked-slots", authenticateUser, appointmentController.getBookedSlots);
router.get("/my", authenticateUser, appointmentController.getAppointments);
router.get("/", authenticateUser, appointmentController.getAppointments);

// Kept for compatibility with the existing doctor appointment screen.
// This route is now read-only and returns only the logged-in doctor's assignments.
router.get(
  "/doctor/all",
  authenticateUser,
  appointmentController.getDoctorAppointments
);

// Admin-only legacy route retained so the existing admin screen keeps working.
router.put("/:id", authenticateAdmin, adminController.updateAppointmentStatus);

module.exports = router;

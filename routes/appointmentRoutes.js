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
} = require("../controllers/appointmentController");

const {
  updateAppointmentStatus,
} = require("../controllers/adminController");

router.post("/book", authenticateUser, bookAppointment);

// booked-slots route MUST come before "/"
router.get("/booked-slots", authenticateUser, getBookedSlots);

router.get("/", authenticateUser, getAppointments);

router.put("/:id", authenticateAdmin, updateAppointmentStatus);

module.exports = router;
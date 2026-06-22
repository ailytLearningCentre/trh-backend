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
  cancelAppointment,
} = require("../controllers/appointmentController");

const {
  updateAppointmentStatus,
} = require("../controllers/adminController");

router.get("/booked-slots", authenticateUser, getBookedSlots);

router.post("/book", authenticateUser, bookAppointment);

router.post("/cancel", authenticateUser, cancelAppointment);

router.put("/:id", authenticateAdmin, updateAppointmentStatus);

router.get("/", authenticateUser, getAppointments);

module.exports = router;
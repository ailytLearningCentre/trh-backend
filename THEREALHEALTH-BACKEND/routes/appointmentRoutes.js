const express = require("express");
const router = express.Router();

const {
  authenticateUser,
  authenticateAdmin,
} = require("../middlewares/authMiddleware");

const {
  bookAppointment,
  getAppointments,
} = require("../controllers/appointmentController");

const {
  updateAppointmentStatus,
} = require("../controllers/adminController");

router.post("/book", authenticateUser, bookAppointment);

router.get("/", authenticateUser, getAppointments);

router.put("/:id", authenticateAdmin, updateAppointmentStatus);

module.exports = router;
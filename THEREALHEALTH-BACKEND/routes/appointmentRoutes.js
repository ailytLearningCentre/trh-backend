const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middlewares/authMiddleware");

const {
  bookAppointment,
  getAppointments,
  getAllAppointmentsForDoctor,
  updateAppointmentStatusByDoctor,
} = require("../controllers/appointmentController");

router.post("/book", authenticateUser, bookAppointment);

router.get("/", authenticateUser, getAppointments);

router.get("/doctor/all", authenticateUser, getAllAppointmentsForDoctor);

router.put("/doctor/:id/status", authenticateUser, updateAppointmentStatusByDoctor);

module.exports = router;
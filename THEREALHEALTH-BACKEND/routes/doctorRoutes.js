const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middlewares/authMiddleware");
const doctorController = require("../controllers/doctorController");

router.get("/dashboard", authenticateUser, doctorController.getDashboard);
router.get("/profile", authenticateUser, doctorController.getProfile);
router.put("/profile", authenticateUser, doctorController.updateProfile);

router.get("/availability", authenticateUser, doctorController.getAvailability);
router.put("/availability", authenticateUser, doctorController.saveAvailability);
router.delete(
  "/availability/:date",
  authenticateUser,
  doctorController.deleteAvailability
);

router.get("/appointments", authenticateUser, doctorController.getAppointments);
router.get("/patients", authenticateUser, doctorController.getPatients);
router.put(
  "/appointments/:appointmentId/notes",
  authenticateUser,
  doctorController.submitConsultationNotes
);

router.get("/notifications", authenticateUser, doctorController.getNotifications);
router.put(
  "/notifications/:notificationId/read",
  authenticateUser,
  doctorController.markNotificationRead
);

router.get("/requests", authenticateUser, doctorController.getRequests);
router.post("/requests", authenticateUser, doctorController.createRequest);

module.exports = router;

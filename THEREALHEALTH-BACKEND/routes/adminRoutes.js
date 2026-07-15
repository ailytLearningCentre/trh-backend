const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middlewares/authMiddleware");
const adminController = require("../controllers/adminController");

router.get("/users", authenticateAdmin, adminController.getAllUsers);
router.post("/users", authenticateAdmin, adminController.createUser);
router.get("/users/:id", authenticateAdmin, adminController.getUserById);
router.put("/users/:id", authenticateAdmin, adminController.updateUser);
router.delete("/users/:id", authenticateAdmin, adminController.deleteUser);
router.get(
  "/users/:id/appointments",
  authenticateAdmin,
  adminController.getUserAppointments
);
router.get(
  "/users/:id/health-conditions",
  authenticateAdmin,
  adminController.getUserHealthConditions
);

router.get("/appointments", authenticateAdmin, adminController.getAllAppointments);
router.put(
  "/appointments/:id/status",
  authenticateAdmin,
  adminController.updateAppointmentStatus
);
router.put(
  "/appointments/:id",
  authenticateAdmin,
  adminController.updateAppointmentStatus
);
router.put(
  "/appointments/:id/assign-doctor",
  authenticateAdmin,
  adminController.assignDoctor
);

router.get("/doctors", authenticateAdmin, adminController.getDoctors);
router.get(
  "/available-doctors",
  authenticateAdmin,
  adminController.getAvailableDoctors
);

router.get(
  "/doctor-requests",
  authenticateAdmin,
  adminController.getDoctorRequests
);
router.put(
  "/doctor-requests/:requestId",
  authenticateAdmin,
  adminController.resolveDoctorRequest
);

router.get("/stats", authenticateAdmin, adminController.getStats);

module.exports = router;

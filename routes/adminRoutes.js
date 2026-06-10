// Placeholder content for adminRoutes.js
const express = require("express");
const router = express.Router();
const { authenticateAdmin } = require("../middlewares/authMiddleware");
const {
  getAllUsers,
  getAllAppointments,
  getStats,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  getUserAppointments,
  getUserHealthConditions,
  updateAppointmentStatus
} = require("../controllers/adminController");

router.get("/users", authenticateAdmin, getAllUsers);
router.post("/users", authenticateAdmin, createUser);
router.get("/users/:id", authenticateAdmin, getUserById);
router.put("/users/:id", authenticateAdmin, updateUser);
router.delete("/admin/users/:id", authenticateAdmin, deleteUser);
router.get("/users/:id/appointments", authenticateAdmin, getUserAppointments);
router.get("/users/:id/health-conditions", authenticateAdmin, getUserHealthConditions);

router.get("/appointments", authenticateAdmin, getAllAppointments);
router.get("/stats", authenticateAdmin, getStats);
router.put("/appointments/status", authenticateAdmin, updateAppointmentStatus);
router.put("/appointments/:id", authenticateAdmin, updateAppointmentStatus);

module.exports = router;
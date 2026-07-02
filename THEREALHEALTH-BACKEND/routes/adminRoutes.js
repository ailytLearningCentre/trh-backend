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
  updateAppointmentStatus,
  getAllDoctors,
} = require("../controllers/adminController");

// ===============================
// USER MODULE
// ===============================
router.get("/users", authenticateAdmin, getAllUsers);
router.post("/users", authenticateAdmin, createUser);
router.get("/users/:id", authenticateAdmin, getUserById);
router.put("/users/:id", authenticateAdmin, updateUser);
router.delete("/users/:id", authenticateAdmin, deleteUser);

router.get("/users/:id/appointments", authenticateAdmin, getUserAppointments);
router.get("/users/:id/health-conditions", authenticateAdmin, getUserHealthConditions);

// ===============================
// DOCTOR MODULE
// ===============================
router.get("/doctors", authenticateAdmin, getAllDoctors);

// ===============================
// APPOINTMENT MODULE
// ===============================
router.get("/appointments", authenticateAdmin, getAllAppointments);
router.put("/appointments/:id/status", authenticateAdmin, updateAppointmentStatus);
router.put("/appointments/:id", authenticateAdmin, updateAppointmentStatus);

// ===============================
// STATS MODULE
// ===============================
router.get("/stats", authenticateAdmin, getStats);

module.exports = router;
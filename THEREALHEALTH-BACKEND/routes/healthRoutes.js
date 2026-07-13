const express = require("express");
const router = express.Router();

const {
  authenticateUser,
} = require("../middlewares/authMiddleware");

const {
  saveHealthQuestionnaire,
  addHealthCondition,
  getMyHealthRecord,
  deleteHealthCondition,
} = require("../controllers/healthController");

// ========================================
// HEALTH QUESTIONNAIRE ROUTES
// Logged-in user only
// ========================================

// Save or replace the complete questionnaire
router.post(
  "/questionnaire",
  authenticateUser,
  saveHealthQuestionnaire
);

// Add one new health condition
router.post(
  "/conditions",
  authenticateUser,
  addHealthCondition
);

// Get logged-in user's complete health record
router.get(
  "/me",
  authenticateUser,
  getMyHealthRecord
);

// Delete one embedded health condition
router.delete(
  "/conditions/:conditionId",
  authenticateUser,
  deleteHealthCondition
);

module.exports = router;
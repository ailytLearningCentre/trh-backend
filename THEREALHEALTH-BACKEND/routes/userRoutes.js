const express = require("express");
const router = express.Router();

const { authenticateUser } = require("../middlewares/authMiddleware");

const {
  submitForm,
  submitHealthData,
  submitQuestionnaire,
  createUser,
  getUserDetails,
  updateUserDetails,
  deleteUserAccount,
  getUserConsultations,
} = require("../controllers/userController");

router.post("/submit-form", authenticateUser, submitForm);
router.post("/submit-health-data", authenticateUser, submitHealthData);
router.post("/submit-questionnaire", authenticateUser, submitQuestionnaire);

router.post("/", createUser);

router.get("/user/details", authenticateUser, getUserDetails);
router.put("/user/update/:id", authenticateUser, updateUserDetails);
router.delete("/user/delete/:id", authenticateUser, deleteUserAccount);

router.get("/consultation/:userId", authenticateUser, getUserConsultations);

module.exports = router;
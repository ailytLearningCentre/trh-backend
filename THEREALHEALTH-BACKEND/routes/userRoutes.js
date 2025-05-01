const express = require("express");
const router = express.Router();
const { authenticateUser } = require("../middlewares/authMiddleware");
const { submitForm, submitHealthData, submitQuestionnaire, createUser, getUserDetails } = require("../controllers/userController");

router.post("/submit-form", authenticateUser, submitForm);
router.post("/submit-health-data", authenticateUser, submitHealthData);
router.post("/submit-questionnaire", authenticateUser, submitQuestionnaire);
router.post("/", createUser); // Route to create a new user
router.get("/user/details", authenticateUser,getUserDetails);


module.exports = router;

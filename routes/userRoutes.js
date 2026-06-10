const express = require("express");
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require("../middlewares/authMiddleware");
const { submitForm, submitHealthData, submitQuestionnaire, createUser, getUserDetails, updateUserDetails, deleteUserAccount, getUserConsultations } = require("../controllers/userController");

router.post("/submit-form", authenticateUser, submitForm);
router.post("/submit-health-data", authenticateUser, submitHealthData);
router.post("/submit-questionnaire", authenticateUser, submitQuestionnaire);
router.post("/", createUser); // Route to create a new user
router.get("/user/details", authenticateUser,getUserDetails);
router.put("/user/update/:id", authenticateUser, updateUserDetails); // Route to update user details
router.delete("/user/delete/:id", authenticateUser, deleteUserAccount); // Route to delete user account
router.get("/consultation/:userid", authenticateUser, getUserConsultations);

module.exports = router;

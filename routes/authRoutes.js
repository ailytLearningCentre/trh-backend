// Placeholder content for authRoutes.js
const express = require("express");
const router = express.Router();
const { sendOtp, verifyOtp, resendOtp } = require("../controllers/authController");

router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/resend-otp", resendOtp);

module.exports = router;
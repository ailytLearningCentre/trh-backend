// Placeholder content for OTP.js
const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phone: String,
  otp: String,
  createdAt: { type: Date, default: Date.now, expires: 300 },
});

module.exports = mongoose.model("OTP", otpSchema);
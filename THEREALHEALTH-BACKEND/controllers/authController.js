const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/admin");
const OTP = require("../models/OTP");
const { generateOTP, sendOTP } = require("../utils/otp");
const JWT_SECRET = process.env.JWT_SECRET;

exports.sendOtp = async (req, res) => {
    const { phone } = req.body;
    console.log("Request received with phone:", phone); // Debugging log
    if (!phone) {
        console.log("Phone number is missing in the request body");
        return res.status(400).json({ message: "Phone number is required" });
    }

    try {
        console.log("Attempting to send OTP...");
        await sendOTP(phone); // Ensure this function is working correctly
        console.log("OTP sent successfully");
        res.json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error sending OTP:", error.message); // Debugging log
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

exports.verifyOtp = async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ message: "Phone and OTP are required" });

  try {
    const record = await OTP.findOne({ phone });
    if (!record || record.otp !== otp) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }


    // OTP is valid, delete it from the database
    await OTP.deleteMany({ phone });

    // Log a message in the terminal
    console.log(`✅ OTP verified successfully for phone: ${phone}`);

    const isAdmin = await Admin.findById(phone);
    if (isAdmin) {
      const token = jwt.sign({ phone, role: "admin" }, JWT_SECRET, { expiresIn: "30d" });
      return res.json({ message: "Admin logged in", token, role: "admin" });
    }

    let user = await User.findById(phone);
    let isNewUser = false;
    if (!user) {
        isNewUser = true;
        user = new User({ _id: phone, name: "New User", role: "user" });
        await user.save(); // Save the user to the database
    }

    const token = jwt.sign({ phone, role: "user" }, JWT_SECRET, { expiresIn: "30d" });
    res.json({ message: isNewUser ? "New user created" : "User exists", token, role: "user", isNewUser });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
};

exports.resendOtp = async (req, res) => {
    const { phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: "Phone number is required" });
    }
    try {
        await sendOTP(phone); // Reuse your existing sendOTP utility
        res.json({ message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error resending OTP:", error.message);
        res.status(500).json({ message: "Error resending OTP", error: error.message });
    }
};


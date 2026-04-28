const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const User = require("../models/User");
const { sendOTP, normalizePhone } = require("../utils/otp");

const JWT_SECRET = process.env.JWT_SECRET || "therealhealth_jwt_secret_123";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

// ========================================
// HARD-CODED ROLE NUMBERS
// ========================================
const HARDCODED_ROLES = {
  "8392935164": "admin",
  "6398911153": "doctor",
  "7668514566": "user",
};

// ========================================
// HELPERS
// ========================================
const buildPhoneVariants = (phone) => {
  const clean = normalizePhone(phone);
  return [...new Set([clean, `+91${clean}`, `91${clean}`])];
};

const getHardcodedRole = (phone) => {
  const clean = normalizePhone(phone);
  return HARDCODED_ROLES[clean] || null;
};

const createToken = ({ phone, role }) => {
  return jwt.sign(
    {
      phone,
      role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

// ========================================
// SEND OTP
// ========================================
const sendOtp = async (req, res) => {
  const phone = normalizePhone(req.body.phone);

  if (!phone || phone.length !== 10) {
    return res.status(400).json({
      message: "Valid 10-digit phone number is required",
    });
  }

  try {
    await sendOTP(phone);

    return res.status(200).json({
      message: "OTP sent successfully",
    });
  } catch (error) {
    console.error("❌ Error sending OTP:", error.message);
    return res.status(500).json({
      message: "Error sending OTP",
      error: error.message,
    });
  }
};

// ========================================
// VERIFY OTP
// ========================================
const verifyOtp = async (req, res) => {
  const phone = normalizePhone(req.body.phone);
  const otp = String(req.body.otp || "").trim();
  const requestedRole = String(req.body.requestedRole || "")
    .trim()
    .toLowerCase();

  if (!phone || phone.length !== 10 || !otp) {
    return res.status(400).json({
      message: "Valid phone and OTP are required",
    });
  }

  try {
    const fullPhone = `+91${phone}`;

    const verificationCheck = await client.verify.v2
      .services(verifyServiceSid)
      .verificationChecks.create({
        to: fullPhone,
        code: otp,
      });

    if (verificationCheck.status !== "approved") {
      return res.status(401).json({
        message: "Invalid or expired OTP",
      });
    }

    let role = getHardcodedRole(phone);
    let isNewUser = false;

    if (!role) {
      const phoneVariants = buildPhoneVariants(phone);

      const existingUser = await User.findOne({
        $or: [
          { _id: { $in: phoneVariants } },
          { phone: { $in: phoneVariants } },
          { phoneNumber: { $in: phoneVariants } },
        ],
      });

      if (existingUser) {
        role = String(existingUser.role || "user").toLowerCase();
        isNewUser = false;
      } else {
        role = requestedRole || "user";
        isNewUser = true;
      }
    }

    if (requestedRole && requestedRole !== role) {
      return res.status(403).json({
        message: `This number is not allowed to login as ${requestedRole}`,
      });
    }

    const token = createToken({ phone, role });

    return res.status(200).json({
      message: "OTP verified successfully",
      token,
      role,
      isNewUser,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error.message);
    return res.status(500).json({
      message: "Error verifying OTP",
      error: error.message,
    });
  }
};

// ========================================
// RESEND OTP
// ========================================
const resendOtp = async (req, res) => {
  const phone = normalizePhone(req.body.phone);

  if (!phone || phone.length !== 10) {
    return res.status(400).json({
      message: "Valid 10-digit phone number is required",
    });
  }

  try {
    await sendOTP(phone);

    return res.status(200).json({
      message: "OTP resent successfully",
    });
  } catch (error) {
    console.error("❌ Error resending OTP:", error.message);
    return res.status(500).json({
      message: "Error resending OTP",
      error: error.message,
    });
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  resendOtp,
};
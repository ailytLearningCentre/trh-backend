const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { sendOTP, normalizePhone, verifyStoredOTP } = require("../utils/otp");

const JWT_SECRET = process.env.JWT_SECRET || "therealhealth_jwt_secret_123";
const GOOGLE_SERVER_CLIENT_ID = process.env.GOOGLE_SERVER_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_SERVER_CLIENT_ID);

// ========================================
// HARD-CODED ROLE NUMBERS
// ========================================
const HARDCODED_ROLES = {
  "8392935164": "doctor",
  "7668514566": "admin",
  "6398911153":"user",
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

const createToken = ({ phone, googleId, role }) => {
  const payload = { role };

  if (phone) payload.phone = phone;
  if (googleId) payload.googleId = googleId;

  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: "7d" }
  );
};

const createGoogleRegistrationToken = ({ googleId, email }) => {
  return jwt.sign(
    {
      googleId,
      email,
      role: "user",
      registrationOnly: true,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
};

// ========================================
// GOOGLE LOGIN
// ========================================
const googleLogin = async (req, res) => {
  const idToken = String(req.body?.idToken || "").trim();

  if (!idToken) {
    return res.status(400).json({
      message: "Google ID token is required",
    });
  }

  if (!GOOGLE_SERVER_CLIENT_ID) {
    console.error("GOOGLE_SERVER_CLIENT_ID is not configured");
    return res.status(500).json({
      message: "Google login is not configured",
    });
  }

  let payload;

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: GOOGLE_SERVER_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.error("Invalid Google ID token:", error.message);
    return res.status(401).json({
      message: "Invalid Google ID token",
    });
  }

  const googleId = String(payload?.sub || "").trim();
  const email = String(payload?.email || "").trim().toLowerCase();
  const name = String(payload?.name || "").trim();
  const picture = String(payload?.picture || "").trim();
  const emailVerified = payload?.email_verified === true;

  if (!googleId || !email) {
    return res.status(400).json({
      message: "Verified Google account email is required",
    });
  }

  if (!emailVerified) {
    return res.status(401).json({
      message: "Google account email is not verified",
    });
  }

  try {
    const existingUser = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (!existingUser) {
      const token = createGoogleRegistrationToken({ googleId, email });

      return res.status(200).json({
        message: "Registration required",
        token,
        isNewUser: true,
        requiresRegistration: true,
        role: "user",
        email,
        name,
        picture,
        googleId,
      });
    }

    if (existingUser.googleId && existingUser.googleId !== googleId) {
      return res.status(409).json({
        message: "This email is already linked to another Google account",
      });
    }

    let userChanged = false;

    if (!existingUser.googleId) {
      existingUser.googleId = googleId;
      userChanged = true;
    }

    if (!existingUser.email) {
      existingUser.email = email;
      userChanged = true;
    }

    if (userChanged) {
      await existingUser.save();
    }

    const role = String(existingUser.role || "user").toLowerCase();
    const phone = String(existingUser._id);
    const token = createToken({ phone, googleId, role });

    return res.status(200).json({
      message: "Google login successful",
      token,
      role,
      isNewUser: false,
      email: existingUser.email || email,
      name: existingUser.name || name,
    });
  } catch (error) {
    console.error("Error during Google login:", error.message);
    return res.status(500).json({
      message: "Error signing in with Google",
    });
  }
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

  if (!phone || phone.length !== 10 || !otp) {
    return res.status(400).json({
      message: "Valid phone and OTP are required",
    });
  }

  try {
    const otpResult = await verifyStoredOTP(phone, otp);

    if (!otpResult.ok) {
      return res.status(401).json({
        message: otpResult.message,
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
          { alternativePhoneNumber: { $in: phoneVariants } },
        ],
      });

      if (existingUser) {
        role = String(existingUser.role || "user").toLowerCase();
        isNewUser = false;
      } else {
        role = "user";
        isNewUser = true;
      }
    }

    const token = createToken({ phone, role });

    return res.status(200).json({
      message: "OTP verified successfully",
      token,
      role,
      isNewUser,
      phone,
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
  googleLogin,
};

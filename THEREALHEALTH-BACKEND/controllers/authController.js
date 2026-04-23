const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Admin = require("../models/admin");
const OTP = require("../models/OTP");
const { sendOTP } = require("../utils/otp");

const JWT_SECRET = process.env.JWT_SECRET;

// Hardcoded numbers for testing
const HARDCODED_ADMIN_NUMBER = "8445934948";
const HARDCODED_DOCTOR_NUMBER = "7668514566";

// Build all useful phone variants
const buildPhoneVariants = (phone) => {
  const rawPhone = String(phone || "").trim();
  const digitsOnly = rawPhone.replace(/\D/g, "");

  let tenDigit = digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    tenDigit = digitsOnly.slice(2);
  }

  const variants = [rawPhone];

  if (digitsOnly) variants.push(digitsOnly);
  if (tenDigit) variants.push(tenDigit);

  if (tenDigit.length === 10) {
    variants.push(`91${tenDigit}`);
    variants.push(`+91${tenDigit}`);
  }

  return [...new Set(variants.filter(Boolean))];
};

// Get normalized 10-digit phone
const getMainPhone = (phone) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }

  if (digitsOnly.length === 10) {
    return digitsOnly;
  }

  return String(phone || "").trim();
};

// Hardcoded role check
const getHardcodedRole = (phone) => {
  const mainPhone = getMainPhone(phone);

  if (mainPhone === HARDCODED_ADMIN_NUMBER) return "admin";
  if (mainPhone === HARDCODED_DOCTOR_NUMBER) return "doctor";

  return null;
};

// SEND OTP
exports.sendOtp = async (req, res) => {
  const phone = String(req.body.phone || "").trim();

  console.log("========== SEND OTP ==========");
  console.log("Request received with phone:", phone);

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    await sendOTP(phone);

    console.log("OTP sent successfully to:", phone);

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

// RESEND OTP
exports.resendOtp = async (req, res) => {
  const phone = String(req.body.phone || "").trim();

  console.log("========== RESEND OTP ==========");
  console.log("Resend OTP request for phone:", phone);

  if (!phone) {
    return res.status(400).json({ message: "Phone number is required" });
  }

  try {
    await sendOTP(phone);

    console.log("OTP resent successfully to:", phone);

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

// VERIFY OTP
exports.verifyOtp = async (req, res) => {
  const phone = String(req.body.phone || "").trim();
  const otp = String(req.body.otp || "").trim();
  const requestedRole = String(req.body.requestedRole || "").trim().toLowerCase();

  console.log("========== VERIFY OTP ==========");
  console.log("Raw phone from request:", phone);
  console.log("OTP from request:", otp);
  console.log("Requested role from frontend:", requestedRole);

  if (!phone || !otp) {
    return res.status(400).json({ message: "Phone and OTP are required" });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({
      message: "JWT_SECRET is missing in environment variables",
    });
  }

  try {
    const phoneVariants = buildPhoneVariants(phone);
    const mainPhone = getMainPhone(phone);

    console.log("Normalized main phone:", mainPhone);
    console.log("Phone variants:", phoneVariants);

    // Check latest OTP
    const record = await OTP.findOne({
      phone: { $in: phoneVariants },
    }).sort({ createdAt: -1 });

    console.log("Latest OTP record found:", record);

    if (!record) {
      console.log("❌ No OTP record found");
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    if (String(record.otp).trim() !== otp) {
      console.log("❌ OTP mismatch");
      console.log("Stored OTP:", String(record.otp).trim());
      console.log("Received OTP:", otp);
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    console.log("✅ OTP matched successfully");

    // Delete used OTP
    await OTP.deleteMany({ phone: { $in: phoneVariants } });
    console.log("Used OTP deleted for variants:", phoneVariants);

    let user = null;
    let adminUser = null;
    let role = "user";
    let isNewUser = false;
    let authPhone = mainPhone;

    // STEP 1: Check hardcoded role first
    const hardcodedRole = getHardcodedRole(mainPhone);
    console.log("Hardcoded role found:", hardcodedRole);

    if (hardcodedRole) {
      role = hardcodedRole;
      authPhone = mainPhone;
      isNewUser = false;

      console.log("✅ Hardcoded role applied:", role);
    } else {
      // STEP 2: Check Admin collection
      adminUser = await Admin.findOne({
        _id: { $in: phoneVariants },
      });

      console.log("Admin user found in DB:", adminUser);

      if (adminUser) {
        role = "admin";
        authPhone = getMainPhone(adminUser._id);

        console.log("✅ Admin found in database");
      } else {
        // STEP 3: Check User collection
        user = await User.findOne({
          _id: { $in: phoneVariants },
        });

        if (!user) {
          user = await User.findOne({
            alternativePhoneNumber: { $in: phoneVariants },
          });
        }

        console.log("User found in DB:", user);

        if (user) {
          role = String(user.role || "user").toLowerCase();
          authPhone = getMainPhone(user._id);

          console.log("✅ User found in database with role:", role);
        } else {
          // STEP 4: New user fallback
          role = "user";
          isNewUser = true;
          authPhone = mainPhone;

          console.log("⚠️ No user/admin found. Treating as new user.");
        }
      }
    }

    console.log("Final role sent to frontend:", role);
    console.log("Final auth phone:", authPhone);
    console.log("Is new user:", isNewUser);

    // Optional role mismatch check
    if (requestedRole && requestedRole !== role) {
      console.log("❌ Requested role mismatch");
      console.log("Requested role:", requestedRole);
      console.log("Actual role:", role);

      return res.status(403).json({
        message: `This number is not registered as ${requestedRole}`,
        actualRole: role,
      });
    }

    const token = jwt.sign(
      { phone: authPhone, role },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    console.log("✅ JWT token created successfully");
    console.log("========== VERIFY OTP SUCCESS ==========");

    return res.status(200).json({
      message: isNewUser ? "New user" : "Login successful",
      token,
      role,
      isNewUser,
      phone: authPhone,
    });
  } catch (error) {
    console.error("❌ Error verifying OTP:", error);
    return res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};
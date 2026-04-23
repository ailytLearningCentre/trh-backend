const OTP = require("../models/OTP");
const sendSMS = require("./sendSMS");

const normalizePhone = (phone) => {
  const digitsOnly = String(phone || "").replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return digitsOnly.slice(2);
  }

  if (digitsOnly.length === 10) {
    return digitsOnly;
  }

  return String(phone || "").trim();
};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phone) => {
  try {
    const mainPhone = normalizePhone(phone);
    const otp = generateOTP();

    console.log(`Generated OTP for ${mainPhone}: ${otp}`);

    await OTP.deleteMany({ phone: mainPhone });

    const otpRecord = new OTP({
      phone: mainPhone,
      otp,
    });

    await otpRecord.save();

    await sendSMS(mainPhone, otp);

    console.log("✅ OTP sent and saved successfully");

    return {
      success: true,
      phone: mainPhone,
      otp,
    };
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

module.exports = { generateOTP, sendOTP };
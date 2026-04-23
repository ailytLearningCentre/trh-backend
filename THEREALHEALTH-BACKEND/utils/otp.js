const OTP = require("../models/OTP");
const sendSMS = require("./sendSMS");

const normalizePhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2);
  }
  if (digits.length === 10) {
    return digits;
  }
  return digits;
};

const generateOTP = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (phone) => {
  try {
    const cleanPhone = normalizePhone(phone);
    const otp = generateOTP();

    console.log(`Generated OTP for ${cleanPhone}: ${otp}`);

    // delete previous OTPs for same number
    await OTP.deleteMany({ phone: cleanPhone });

    // send the SAME OTP by SMS
    await sendSMS(
      cleanPhone,
      `Your OTP is ${otp}. It is valid for 5 minutes.`
    );

    // store the SAME OTP in Mongo
    const otpRecord = new OTP({
      phone: cleanPhone,
      otp,
    });

    await otpRecord.save();
    console.log("✅ OTP saved in MongoDB and sent via SMS");
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

module.exports = {
  sendOTP,
  normalizePhone,
};
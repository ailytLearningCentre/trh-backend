const OTP = require("../models/OTP");
const sendSMS = require("./sendSMS");

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phone) => {
  try {
    const otp = generateOTP();

    // Use sendSMS to send the OTP
    await sendSMS(phone, `Your OTP is ${otp}`);
    console.log("✅ OTP sent successfully");

    // Save the OTP in the database
    const otpRecord = new OTP({ phone, otp });
    await otpRecord.save();

    console.log("SAVED OTP RECORD FOR:", phone, "OTP:", otp);
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

module.exports = { generateOTP, sendOTP };
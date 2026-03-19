const sendSMS = require("./sendSMS");

const sendOTP = async (phone) => {
  try {
    await sendSMS(phone);
    console.log("✅ OTP sent successfully via Twilio Verify");
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

module.exports = { sendOTP };
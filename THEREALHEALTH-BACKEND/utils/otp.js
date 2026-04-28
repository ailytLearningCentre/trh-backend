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

const sendOTP = async (phone) => {
  try {
    const cleanPhone = normalizePhone(phone);

    await sendSMS(cleanPhone);
    console.log("✅ OTP requested through Twilio Verify");
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

module.exports = {
  sendOTP,
  normalizePhone,
};
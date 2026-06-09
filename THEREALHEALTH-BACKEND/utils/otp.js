const sendSMS = require("./sendSMS");
const OTP = require("../models/OTP");

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

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTP = async (phone) => {
  try {
    const cleanPhone = normalizePhone(phone);

    if (!cleanPhone || cleanPhone.length !== 10) {
      throw new Error("Invalid phone number");
    }

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await OTP.deleteMany({
      phone: { $in: [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`] },
    });

    await OTP.create({
      phone: cleanPhone,
      otp,
      expiresAt,
    });

    await sendSMS(cleanPhone);

    console.log("✅ Backend-generated OTP stored in Mongo and sent for:", cleanPhone);

    return otp;
  } catch (error) {
    console.error("❌ Error in sendOTP:", error.message);
    throw error;
  }
};

const verifyStoredOTP = async (phone, otp) => {
  const cleanPhone = normalizePhone(phone);
  const cleanOtp = String(otp || "").trim();

  const record = await OTP.findOne({
    phone: { $in: [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`] },
  }).sort({ createdAt: -1 });

  if (!record) {
    return { ok: false, message: "OTP not found. Please request a new OTP." };
  }

  if (record.expiresAt && new Date() > new Date(record.expiresAt)) {
    await OTP.deleteMany({
      phone: { $in: [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`] },
    });
    return { ok: false, message: "OTP expired. Please request a new OTP." };
  }

  if (record.otp !== cleanOtp) {
    return { ok: false, message: "Invalid OTP." };
  }

  await OTP.deleteMany({
    phone: { $in: [cleanPhone, `+91${cleanPhone}`, `91${cleanPhone}`] },
  });

  return { ok: true };
};

module.exports = {
  sendOTP,
  normalizePhone,
  verifyStoredOTP,
};
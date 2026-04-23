const twilio = require("twilio");

const normalizeIndianPhone = (to) => {
  const digitsOnly = String(to || "").replace(/\D/g, "");

  if (digitsOnly.length === 12 && digitsOnly.startsWith("91")) {
    return `+${digitsOnly}`;
  }

  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }

  if (String(to || "").startsWith("+")) {
    return String(to).trim();
  }

  throw new Error("Invalid phone number format");
};

const isTestMode =
  String(process.env.OTP_TEST_MODE || "false").trim().toLowerCase() === "true";

const sendSMS = async (to, otp) => {
  const phone = normalizeIndianPhone(to);

  if (isTestMode) {
    console.log("🧪 OTP TEST MODE ENABLED");
    console.log(`📱 OTP for ${phone}: ${otp}`);
    return {
      sid: "TEST_MODE",
      status: "pending",
      to: phone,
      channel: "sms",
    };
  }

  const accountSid = String(process.env.TWILIO_ACCOUNT_SID || "").trim();
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || "").trim();
  const verifyServiceSid = String(
    process.env.TWILIO_VERIFY_SERVICE_SID || ""
  ).trim();

  const client = twilio(accountSid, authToken);

  return await client.verify.v2
    .services(verifyServiceSid)
    .verifications.create({
      to: phone,
      channel: "sms",
      customCode: String(otp),
    });
};

module.exports = sendSMS;
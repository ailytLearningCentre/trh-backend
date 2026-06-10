const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

const sendSMS = async (to, otpCode) => {
  try {
    const cleanTo = String(to || "").replace(/\D/g, "");

    if (!cleanTo || cleanTo.length !== 10) {
      throw new Error("Invalid phone number");
    }

    if (!otpCode) {
      throw new Error("OTP code is required");
    }

    const phone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: "sms",
        customCode: otpCode,
      });

    console.log("✅ Backend-generated OTP sent via Twilio Verify to:", phone);
    return verification;
  } catch (error) {
    console.error("❌ Error sending OTP via Twilio Verify:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
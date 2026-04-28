const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

const client = twilio(accountSid, authToken);

const sendSMS = async (to) => {
  try {
    const cleanTo = String(to || "").replace(/\D/g, "");
    const phone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    console.log("✅ Twilio Verify OTP sent:", verification.sid, "to:", phone);
    return verification;
  } catch (error) {
    console.error("❌ Error sending OTP via Twilio Verify:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
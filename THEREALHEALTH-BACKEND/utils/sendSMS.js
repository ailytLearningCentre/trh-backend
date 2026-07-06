const twilio = require("twilio");

const sendSMS = async (to, otpCode) => {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    console.log(
      "TWILIO_ACCOUNT_SID:",
      accountSid ? accountSid.slice(0, 6) + "..." : "MISSING"
    );
    console.log("TWILIO_AUTH_TOKEN:", authToken ? "LOADED" : "MISSING");
    console.log(
      "TWILIO_VERIFY_SERVICE_SID:",
      verifyServiceSid ? verifyServiceSid.slice(0, 6) + "..." : "MISSING"
    );

    if (!accountSid) throw new Error("TWILIO_ACCOUNT_SID missing in .env");
    if (!authToken) throw new Error("TWILIO_AUTH_TOKEN missing in .env");
    if (!verifyServiceSid) {
      throw new Error("TWILIO_VERIFY_SERVICE_SID missing in .env");
    }

    const cleanTo = String(to || "").replace(/\D/g, "");

    if (cleanTo.length !== 10 && !(cleanTo.length === 12 && cleanTo.startsWith("91"))) {
      throw new Error("Invalid phone number");
    }

    const phone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

    const client = twilio(accountSid.trim(), authToken.trim());

    const verification = await client.verify.v2
      .services(verifyServiceSid.trim())
      .verifications.create({
        to: phone,
        channel: "sms",
        customCode: otpCode,
      });

    console.log("✅ Twilio Verify SMS sent with backend OTP to:", phone);
    return verification;
  } catch (error) {
    console.error("❌ Twilio error message:", error.message);
    console.error("❌ Twilio error code:", error.code);
    console.error("❌ Twilio status:", error.status);
    throw error;
  }
};

module.exports = sendSMS;
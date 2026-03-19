const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to) => {
  try {
    const phone = to.startsWith("+") ? to : `+91${to}`;

    const response = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications.create({
        to: phone,
        channel: "sms",
      });

    console.log("✅ OTP sent:", response.status);
    return response;
  } catch (error) {
    console.error("❌ Failed to send SMS:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
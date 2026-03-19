const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSMS = async (to, body) => {
  try {
    const phone = to.startsWith("+") ? to : `+91${to}`;

    const response = await client.messages.create({
      body: body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });

    console.log("✅ OTP SMS sent:", response.sid);
  } catch (error) {
    console.error("❌ Failed to send SMS:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
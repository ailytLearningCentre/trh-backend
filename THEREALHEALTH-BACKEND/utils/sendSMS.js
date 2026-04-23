const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

const sendSMS = async (to, message) => {
  try {
    const cleanTo = String(to || "").replace(/\D/g, "");
    const phone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

    const sms = await client.messages.create({
      body: message,
      from: twilioPhoneNumber,
      to: phone,
    });

    console.log("✅ OTP SMS sent:", sms.sid, "to:", phone);
    return sms;
  } catch (error) {
    console.error("❌ Error sending OTP via Twilio SMS:", error.message);
    throw error;
  }
};

module.exports = sendSMS;
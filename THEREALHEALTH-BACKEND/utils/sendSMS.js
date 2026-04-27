const twilio = require("twilio");

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  console.error("❌ Missing Twilio env vars");
  console.error("TWILIO_ACCOUNT_SID:", accountSid ? "Present" : "Missing");
  console.error("TWILIO_AUTH_TOKEN:", authToken ? "Present" : "Missing");
  console.error("TWILIO_PHONE_NUMBER:", twilioPhoneNumber ? "Present" : "Missing");
}

const client = twilio(accountSid, authToken);

const sendSMS = async (to, message) => {
  try {
    const cleanTo = String(to || "").replace(/\D/g, "");
    const phone = cleanTo.startsWith("91") ? `+${cleanTo}` : `+91${cleanTo}`;

    if (!twilioPhoneNumber) {
      throw new Error("TWILIO_PHONE_NUMBER is missing on the server");
    }

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
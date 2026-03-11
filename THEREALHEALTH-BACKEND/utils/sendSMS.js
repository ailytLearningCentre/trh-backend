const twilio = require("twilio");
console.log("TWILIO CHECK", {
  hasSid: !!process.env.TWILIO_ACCOUNT_SID,
  hasToken: !!process.env.TWILIO_AUTH_TOKEN,
  hasPhone: !!process.env.TWILIO_PHONE_NUMBER,
});
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const sendSMS = async (to, body) => {
    try {
        console.log(`Sending SMS to: ${to}, Body: ${body}`);
        await client.messages.create({
            body,
            from: twilioPhoneNumber,
            to: `+91${to}`, // Ensure the phone number format is correct
        });
        console.log("✅ SMS sent successfully");
    } catch (error) {
        console.error("❌ Failed to send SMS:", error.message);
        throw error;
    }
};

module.exports = sendSMS;
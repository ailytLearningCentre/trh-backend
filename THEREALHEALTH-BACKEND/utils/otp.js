// Placeholder content for otpGenerator.js
const twilio = require("twilio");
const OTP = require("../models/OTP");
const sendSMS = require("./sendSMS");

console.log("sendSMS function:", sendSMS);

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const from = process.env.TWILIO_PHONE_NUMBER;

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOTP = async (phone) => {
    try {
       const otp = generateOTP(); // Generate a 6-digit OTP
         console.log(`Generated OTP: ${otp}`); // Debugging log

           await OTP.deleteMany({ phone });

              // Use sendSMS to send the OTP
          await sendSMS(phone, `Your OTP is ${otp}`);
        console.log("✅ OTP sent successfully");

        // Save the OTP in the database
        const otpRecord = new OTP({ phone, otp });
        await otpRecord.save();
    } catch (error) {
        console.error("❌ Error in sendOTP:", error.message);
        throw error;
    }
};

module.exports = { generateOTP, sendOTP };

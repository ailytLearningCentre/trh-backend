const sendOTP = async (phone) => {
    try {
        console.log("SEND OTP PHONE:", phone);

        const otp = generateOTP(); // Generate a 6-digit OTP
        console.log(`Generated OTP: ${otp}`); // Debugging log

        await OTP.deleteMany({ phone });

        // Use sendSMS to send the OTP
        await sendSMS(phone, `Your OTP is ${otp}`);
        console.log("✅ OTP sent successfully");

        // Save the OTP in the database
        const otpRecord = new OTP({ phone, otp });
        await otpRecord.save();

        console.log("SAVED OTP RECORD FOR:", phone, "OTP:", otp);
    } catch (error) {
        console.error("❌ Error in sendOTP:", error.message);
        throw error;
    }
};
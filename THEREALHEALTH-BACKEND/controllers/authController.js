const User = require("../models/User");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");
const { sendOTP } = require("../utils/otp");

const JWT_SECRET = process.env.JWT_SECRET;

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

exports.sendOtp = async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }

    try {
        await sendOTP(phone);
        console.log("OTP sent successfully");
        return res.json({ message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error sending OTP:", error.message);
        return res.status(500).json({
            message: "Error sending OTP",
            error: error.message
        });
    }
};

exports.resendOtp = async (req, res) => {
    const { phone } = req.body;

    if (!phone) {
        return res.status(400).json({ message: "Phone is required" });
    }

    try {
        await sendOTP(phone);
        console.log("OTP resent successfully");
        return res.json({ message: "OTP resent successfully" });
    } catch (error) {
        console.error("Error resending OTP:", error.message);
        return res.status(500).json({
            message: "Error resending OTP",
            error: error.message
        });
    }
};

exports.verifyOtp = async (req, res) => {
    let { phone, otp } = req.body;

    console.log("VERIFY BODY:", req.body);

    if (!phone || !otp) {
        return res.status(400).json({ message: "Phone and OTP are required" });
    }

    try {
        phone = String(phone).trim();
        otp = String(otp).trim();

        const formattedPhone = phone.startsWith("+") ? phone : `+91${phone}`;

        console.log("VERIFY PHONE:", formattedPhone);
        console.log("VERIFY OTP:", otp);

        const verificationCheck = await client.verify.v2
            .services(process.env.TWILIO_VERIFY_SERVICE_SID)
            .verificationChecks.create({
                to: formattedPhone,
                code: otp,
            });

        console.log("TWILIO VERIFY STATUS:", verificationCheck.status);

        if (verificationCheck.status !== "approved") {
            return res.status(401).json({ message: "Invalid or expired OTP" });
        }

        console.log(`✅ OTP verified successfully for phone: ${formattedPhone}`);

        const isAdmin = await Admin.findById(phone);
        if (isAdmin) {
            const token = jwt.sign(
                { phone, role: "admin" },
                JWT_SECRET,
                { expiresIn: "30d" }
            );

            return res.json({
                message: "Admin logged in",
                token,
                role: "admin"
            });
        }

        let user = await User.findById(phone);
        let isNewUser = false;

        if (!user) {
            isNewUser = true;
            user = new User({
                _id: phone,
                name: "New User",
                role: "user"
            });
            await user.save();
        }

        const token = jwt.sign(
            { phone, role: "user" },
            JWT_SECRET,
            { expiresIn: "30d" }
        );

        return res.json({
            message: isNewUser ? "New user created" : "User exists",
            token,
            role: "user",
            isNewUser
        });
    } catch (error) {
        console.error("ERROR VERIFYING OTP:", error.message);
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
};
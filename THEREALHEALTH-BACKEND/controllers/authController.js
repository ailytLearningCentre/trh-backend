const OTP = require("../models/OTP");
const User = require("../models/User");
const Admin = require("../models/admin");
const jwt = require("jsonwebtoken");
const { sendOTP } = require("../utils/otp");

const JWT_SECRET = process.env.JWT_SECRET;

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
    const { phone, otp } = req.body;

    console.log("VERIFY BODY:", req.body);

    if (!phone || !otp) {
        return res.status(400).json({ message: "Phone and OTP are required" });
    } 
    try {
        const record = await OTP.findOne({ phone }).sort({ createdAt: -1 });
        console.log("LATEST OTP RECORD:", record);

        if (!record || String(record.otp) !== String(otp)) {
            console.log("OTP MISMATCH => stored:", record?.otp, "received:", otp);
            return res.status(401).json({ message: "Invalid or expired OTP" });
        }

        await OTP.deleteMany({ phone });

        console.log(`✅ OTP verified successfully for phone: ${phone}`);

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
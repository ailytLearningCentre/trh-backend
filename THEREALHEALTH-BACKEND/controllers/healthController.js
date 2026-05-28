const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "therealhealth_jwt_secret_123";

const submitHealthData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const userId = String(decoded.phone || "").trim();

    if (!userId) {
      return res.status(400).json({
        message: "User phone not found in token",
      });
    }

    const { selectedCondition, questionnaireResponses } = req.body;

    if (!selectedCondition || typeof selectedCondition !== "string") {
      return res.status(400).json({
        message: "selectedCondition is required",
      });
    }

    if (
      !Array.isArray(questionnaireResponses) ||
      questionnaireResponses.length === 0
    ) {
      return res.status(400).json({
        message: "questionnaireResponses must be a non-empty array",
      });
    }

    const cleanedResponses = questionnaireResponses.map((item) => ({
      question: String(item.question || "").trim(),
      answer: String(item.answer || "").trim(),
    }));

    const hasInvalidEntry = cleanedResponses.some(
      (item) => !item.question || !item.answer
    );

    if (hasInvalidEntry) {
      return res.status(400).json({
        message: "Each questionnaire response must include question and answer",
      });
    }

    let user = await User.findById(userId);

    if (!user) {
      user = await User.findOne({
        $or: [
          { phone: userId },
          { phoneNumber: userId },
          { alternativePhoneNumber: userId },
        ],
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const existingConditionIndex = user.healthConditions.findIndex(
      (condition) => condition.conditionName === selectedCondition
    );

    if (existingConditionIndex >= 0) {
      user.healthConditions[existingConditionIndex].questionnaireResponses =
        cleanedResponses;
    } else {
      user.healthConditions.push({
        conditionName: selectedCondition,
        questionnaireResponses: cleanedResponses,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Health data submitted successfully",
      userId: user._id,
      selectedCondition,
      healthConditions: user.healthConditions,
    });
  } catch (error) {
    console.error("❌ Error submitting health data:", error.message);
    return res.status(500).json({
      message: "Failed to submit health data",
      error: error.message,
    });
  }
};

const getHealthData = async (req, res) => {
  try {
    const authHeader = req.headers.authorization || "";

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Authorization token missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        message: "Invalid or expired token",
      });
    }

    const userId = String(decoded.phone || "").trim();

    let user = await User.findById(userId);

    if (!user) {
      user = await User.findOne({
        $or: [
          { phone: userId },
          { phoneNumber: userId },
          { alternativePhoneNumber: userId },
        ],
      });
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "Health data fetched successfully",
      userId: user._id,
      healthConditions: user.healthConditions || [],
    });
  } catch (error) {
    console.error("❌ Error fetching health data:", error.message);
    return res.status(500).json({
      message: "Failed to fetch health data",
      error: error.message,
    });
  }
};

module.exports = {
  submitHealthData,
  getHealthData,
};
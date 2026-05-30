const jwt = require("jsonwebtoken");
const User = require("../models/User");

const JWT_SECRET = process.env.JWT_SECRET || "therealhealth_jwt_secret_123";

const getUserFromToken = async (req) => {
  const authHeader = req.headers.authorization || "";

  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization token missing or invalid");
  }

  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  const userId = String(decoded.phone || "").trim();

  if (!userId) {
    throw new Error("User phone not found in token");
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
    throw new Error("User not found");
  }

  return user;
};

const submitHealthData = async (req, res) => {
  try {
    let user;

    try {
      user = await getUserFromToken(req);
    } catch (err) {
      const msg = err.message || "Unauthorized";
      const code =
          msg === "User not found"
              ? 404
              : msg === "Authorization token missing or invalid" ||
                msg === "Invalid or expired token"
              ? 401
              : 400;

      return res.status(code).json({ message: msg });
    }

    const { questionnaireResponses } = req.body;

    if (
      !Array.isArray(questionnaireResponses) ||
      questionnaireResponses.length === 0
    ) {
      return res.status(400).json({
        message: "questionnaireResponses must be a non-empty array",
      });
    }

    const cleanedResponses = questionnaireResponses.map((item) => ({
      conditionName: String(item.conditionName || "").trim(),
      question: String(item.question || "").trim(),
      answer: String(item.answer || "").trim(),
    }));

    const hasInvalidEntry = cleanedResponses.some(
      (item) => !item.conditionName || !item.question || !item.answer
    );

    if (hasInvalidEntry) {
      return res.status(400).json({
        message:
          "Each questionnaire response must include conditionName, question and answer",
      });
    }

    // Group responses by conditionName
    const grouped = {};
    for (const item of cleanedResponses) {
      if (!grouped[item.conditionName]) {
        grouped[item.conditionName] = [];
      }

      grouped[item.conditionName].push({
        question: item.question,
        answer: item.answer,
      });
    }

    // Upsert each condition into user.healthConditions
    for (const [conditionName, responses] of Object.entries(grouped)) {
      const existingConditionIndex = user.healthConditions.findIndex(
        (condition) => condition.conditionName === conditionName
      );

      if (existingConditionIndex >= 0) {
        user.healthConditions[existingConditionIndex].questionnaireResponses =
          responses;
      } else {
        user.healthConditions.push({
          conditionName,
          questionnaireResponses: responses,
        });
      }
    }

    await user.save();

    return res.status(200).json({
      message: "Health data submitted successfully",
      userId: user._id,
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
    let user;

    try {
      user = await getUserFromToken(req);
    } catch (err) {
      const msg = err.message || "Unauthorized";
      const code =
          msg === "User not found"
              ? 404
              : msg === "Authorization token missing or invalid" ||
                msg === "Invalid or expired token"
              ? 401
              : 400;

      return res.status(code).json({ message: msg });
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
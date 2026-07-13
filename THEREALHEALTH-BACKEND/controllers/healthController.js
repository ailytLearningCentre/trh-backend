const User = require("../models/User");

// ========================================
// HELPERS
// ========================================

const getLoggedInPhone = (req) => {
  return String(
    req.user?.phone ||
      req.user?._id ||
      req.body?.phone ||
      req.params?.phone ||
      ""
  ).trim();
};

const buildPhoneVariants = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");

  let cleanPhone = digits;

  if (digits.length === 12 && digits.startsWith("91")) {
    cleanPhone = digits.slice(2);
  }

  return [
    cleanPhone,
    `+91${cleanPhone}`,
    `91${cleanPhone}`,
  ];
};

const findUserByPhone = async (phone) => {
  const variants = buildPhoneVariants(phone);

  return User.findOne({
    $or: [
      { _id: { $in: variants } },
      { alternativePhoneNumber: { $in: variants } },
    ],
  });
};

const normalizeQuestionnaireResponses = (responses) => {
  if (!Array.isArray(responses)) {
    return [];
  }

  return responses
    .map((item) => ({
      question: String(item?.question || "").trim(),
      answer: String(item?.answer || "").trim(),
    }))
    .filter((item) => item.question || item.answer);
};

const normalizeHealthConditions = (conditions) => {
  if (!Array.isArray(conditions)) {
    return [];
  }

  return conditions
    .map((condition) => ({
      conditionName: String(condition?.conditionName || "").trim(),
      questionnaireResponses: normalizeQuestionnaireResponses(
        condition?.questionnaireResponses
      ),
    }))
    .filter(
      (condition) =>
        condition.conditionName ||
        condition.questionnaireResponses.length > 0
    );
};

// ========================================
// SAVE OR REPLACE HEALTH QUESTIONNAIRE
// Logged-in user
// ========================================

exports.saveHealthQuestionnaire = async (req, res) => {
  try {
    const phone = getLoggedInPhone(req);

    if (!phone) {
      return res.status(400).json({
        message: "User phone number is required",
      });
    }

    const user = await findUserByPhone(phone);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const healthConditions = normalizeHealthConditions(
      req.body.healthConditions
    );

    if (healthConditions.length === 0) {
      return res.status(400).json({
        message: "At least one health condition or response is required",
      });
    }

    user.healthConditions = healthConditions;
    await user.save();

    return res.status(200).json({
      message: "Health questionnaire saved successfully",
      healthConditions: user.healthConditions,
    });
  } catch (error) {
    console.error(
      "Error saving health questionnaire:",
      error.message
    );

    return res.status(500).json({
      message: "Error saving health questionnaire",
      error: error.message,
    });
  }
};

// ========================================
// ADD ONE HEALTH CONDITION
// Logged-in user
// ========================================

exports.addHealthCondition = async (req, res) => {
  try {
    const phone = getLoggedInPhone(req);

    if (!phone) {
      return res.status(400).json({
        message: "User phone number is required",
      });
    }

    const user = await findUserByPhone(phone);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const conditionName = String(
      req.body.conditionName || ""
    ).trim();

    const questionnaireResponses =
      normalizeQuestionnaireResponses(
        req.body.questionnaireResponses
      );

    if (!conditionName && questionnaireResponses.length === 0) {
      return res.status(400).json({
        message:
          "Condition name or questionnaire responses are required",
      });
    }

    user.healthConditions.push({
      conditionName,
      questionnaireResponses,
    });

    await user.save();

    return res.status(201).json({
      message: "Health condition added successfully",
      healthConditions: user.healthConditions,
    });
  } catch (error) {
    console.error(
      "Error adding health condition:",
      error.message
    );

    return res.status(500).json({
      message: "Error adding health condition",
      error: error.message,
    });
  }
};

// ========================================
// GET LOGGED-IN USER HEALTH RECORD
// ========================================

exports.getMyHealthRecord = async (req, res) => {
  try {
    const phone = getLoggedInPhone(req);

    if (!phone) {
      return res.status(400).json({
        message: "User phone number is required",
      });
    }

    const user = await findUserByPhone(phone);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      user: {
        _id: user._id,
        name: user.name,
        age: user.age,
        gender: user.gender,
        weight: user.weight,
        height: user.height,
        alternativePhoneNumber:
          user.alternativePhoneNumber,
        role: user.role,
        healthConditions:
          user.healthConditions || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Error fetching health record:",
      error.message
    );

    return res.status(500).json({
      message: "Error fetching health record",
      error: error.message,
    });
  }
};

// ========================================
// DELETE ONE HEALTH CONDITION
// Logged-in user
// ========================================

exports.deleteHealthCondition = async (req, res) => {
  try {
    const phone = getLoggedInPhone(req);
    const conditionId = req.params.conditionId;

    if (!phone) {
      return res.status(400).json({
        message: "User phone number is required",
      });
    }

    const user = await findUserByPhone(phone);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const condition = user.healthConditions.id(conditionId);

    if (!condition) {
      return res.status(404).json({
        message: "Health condition not found",
      });
    }

    condition.deleteOne();
    await user.save();

    return res.status(200).json({
      message: "Health condition deleted successfully",
      healthConditions: user.healthConditions,
    });
  } catch (error) {
    console.error(
      "Error deleting health condition:",
      error.message
    );

    return res.status(500).json({
      message: "Error deleting health condition",
      error: error.message,
    });
  }
};
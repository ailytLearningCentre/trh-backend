const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

const getAuthenticatedUser = (req) => {
  return req.authenticatedUser || null;
};

exports.submitForm = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const {
      name,
      age,
      gender,
      weight,
      height,
      alternativePhoneNumber,
    } = req.body;

    if (name !== undefined) user.name = name;
    if (age !== undefined) user.age = age;
    if (gender !== undefined) user.gender = gender;
    if (weight !== undefined) user.weight = weight;

    if (height !== undefined) {
      user.height = { value: height };
    }

    if (alternativePhoneNumber !== undefined) {
      user.alternativePhoneNumber =
        alternativePhoneNumber;
    }

    await user.save();

    return res.status(200).json({
      message: "Form submitted successfully!",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error submitting form",
      error: error.message,
    });
  }
};

exports.submitHealthData = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const selectedCondition = String(
      req.body.selectedCondition || "General Health"
    ).trim();

    const { questionnaireResponses } = req.body;

    if (
      !Array.isArray(questionnaireResponses) ||
      questionnaireResponses.length === 0
    ) {
      return res.status(400).json({
        message:
          "questionnaireResponses must be a non-empty array",
      });
    }

    const cleanedResponses =
      questionnaireResponses.map((item) => ({
        question: String(item.question || "").trim(),
        answer: String(item.answer || "").trim(),
      }));

    const invalidResponse = cleanedResponses.some(
      (item) => !item.question || !item.answer
    );

    if (invalidResponse) {
      return res.status(400).json({
        message:
          "Each response must include question and answer",
      });
    }

    if (!Array.isArray(user.healthConditions)) {
      user.healthConditions = [];
    }

    const existingIndex =
      user.healthConditions.findIndex(
        (condition) =>
          String(condition.conditionName)
            .trim()
            .toLowerCase() ===
          selectedCondition.toLowerCase()
      );

    if (existingIndex >= 0) {
      user.healthConditions[
        existingIndex
      ].questionnaireResponses = cleanedResponses;
    } else {
      user.healthConditions.push({
        conditionName: selectedCondition,
        questionnaireResponses: cleanedResponses,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Health data submitted successfully",
      user,
    });
  } catch (error) {
    console.error(
      "Error submitting health data:",
      error.message
    );

    return res.status(500).json({
      message: "Error submitting health data",
      error: error.message,
    });
  }
};

exports.submitQuestionnaire = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const conditionName = String(
      req.body.conditionName ||
        req.body.selectedCondition ||
        ""
    ).trim();

    const responses =
      req.body.responses ||
      req.body.questionnaireResponses;

    if (
      !conditionName ||
      !Array.isArray(responses) ||
      responses.length === 0
    ) {
      return res.status(400).json({
        message: "Invalid request format",
      });
    }

    const cleanedResponses = responses.map((item) => ({
      question: String(item.question || "").trim(),
      answer: String(item.answer || "").trim(),
    }));

    const existingIndex =
      user.healthConditions.findIndex(
        (condition) =>
          condition.conditionName === conditionName
      );

    if (existingIndex >= 0) {
      user.healthConditions[
        existingIndex
      ].questionnaireResponses = cleanedResponses;
    } else {
      user.healthConditions.push({
        conditionName,
        questionnaireResponses: cleanedResponses,
      });
    }

    await user.save();

    return res.status(200).json({
      message: "Questionnaire submitted successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error submitting questionnaire",
      error: error.message,
    });
  }
};

exports.createUser = async (req, res) => {
  try {
    const phone = String(
      req.body._id ||
        req.body.phone ||
        req.body.phoneNumber ||
        ""
    )
      .replace(/\D/g, "")
      .slice(-10);

    if (!phone || phone.length !== 10) {
      return res.status(400).json({
        message: "Valid phone number is required",
      });
    }

    const existingUser = await User.findById(phone);

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
        user: existingUser,
      });
    }

    const user = new User({
      ...req.body,
      _id: phone,
    });

    await user.save();

    return res.status(201).json({
      message: "User created successfully",
      user,
    });
  } catch (error) {
    console.error("Error creating user:", error.message);

    return res.status(500).json({
      message: "Error creating user",
      error: error.message,
    });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const user = getAuthenticatedUser(req);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User details fetched successfully",
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

exports.updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: req.body },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!updatedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.status(200).json({
      message: "User details updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error updating user details",
      error: error.message,
    });
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    await Appointment.deleteMany({
      userId: id,
    });

    return res.status(200).json({
      message:
        "User account and related data deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error deleting user account",
      error: error.message,
    });
  }
};

exports.getUserConsultations = async (req, res) => {
  try {
    const userId =
      req.params.userid || req.params.userId;

    const consultations = await Consultation.find({
      $or: [
        { userId },
        { user: userId },
      ],
    });

    return res.status(200).json({
      consultations,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Error fetching consultations",
      error: error.message,
    });
  }
};
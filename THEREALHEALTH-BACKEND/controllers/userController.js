const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

exports.submitForm = async (req, res) => {
  try {
    const phone = req.user.phone;
    const { name, age, gender, weight, height, alternativePhoneNumber } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      phone,
      { name, age, gender, weight, height: { value: height }, alternativePhoneNumber },
      { new: true, upsert: true }
    );

    res.status(201).json({ message: "Form submitted successfully!", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

exports.submitHealthData = async (req, res) => {
  try {
    const phone = req.user.phone;
    const { questionnaireResponses } = req.body;

    if (!Array.isArray(questionnaireResponses) || questionnaireResponses.length === 0) {
      return res.status(400).json({
        message: "questionnaireResponses must be a non-empty array",
      });
    }

    let user = await User.findById(phone);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
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
        message: "Each questionnaire response must include conditionName, question and answer",
      });
    }

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

    for (const [conditionName, responses] of Object.entries(grouped)) {
      const existingCondition = user.healthConditions.find(
        (c) => c.conditionName === conditionName
      );

      if (existingCondition) {
        existingCondition.questionnaireResponses = responses;
      } else {
        user.healthConditions.push({
          conditionName,
          questionnaireResponses: responses,
        });
      }
    }

    await user.save();

    res.status(200).json({
      message: "Health data submitted successfully",
      user,
    });
  } catch (error) {
    console.error("Error submitting health data:", error.message);
    res.status(500).json({
      error: "Internal server error",
      details: error.message,
    });
  }
};

exports.submitQuestionnaire = async (req, res) => {
  try {
    const phone = req.user.phone;
    const { conditionName, responses } = req.body;

    if (!conditionName || !Array.isArray(responses)) {
      return res.status(400).json({ message: "Invalid request format" });
    }

    let user = await User.findById(phone);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existingCondition = user.healthConditions.find(
      (condition) => condition.conditionName === conditionName
    );

    if (existingCondition) {
      existingCondition.questionnaireResponses = responses;
    } else {
      user.healthConditions.push({ conditionName, questionnaireResponses: responses });
    }

    await user.save();
    res.status(200).json({ message: "Questionnaire submitted successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message });
  }
};

exports.createUser = async (req, res) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({ message: "Request body is missing or invalid" });
  }

  try {
    const user = new User(req.body);
    await user.save();
    res.status(201).json({ message: "User created successfully", user });
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).json({ message: "Error creating user", error: error.message });
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const phone = req.user.phone;

    const user = await User.findById(phone);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User details fetched successfully", user });
  } catch (error) {
    console.error("Error fetching user details:", error.message);
    res.status(500).json({
      message: "Error fetching user details",
      error: error.message,
    });
  }
};

exports.updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, age, weight, height } = req.body;

    if (!name && !age && !weight && !height) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const updatedUser = await User.findOneAndUpdate(
      { _id: id },
      { $set: { name, age, weight, height } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User details updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Error updating user details:", error);
    res.status(500).json({ message: "Error updating user details", error: error.message });
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedUser = await User.findByIdAndDelete({ _id: id });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await Appointment.deleteMany({ _id: id });

    res.status(200).json({ message: "User account and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error.message);
    res.status(500).json({ message: "Error deleting user account", error: error.message });
  }
};

exports.getUserConsultations = async (req, res) => {
  try {
    const userId = req.params.userid || req.params.userId;

    if (!userId) {
      return res.status(400).json({
        message: "User ID is required",
      });
    }

    const appointments = await Appointment.find({ userId }).sort({
      date: -1,
      createdAt: -1,
    });

    if (!appointments || appointments.length === 0) {
      return res.status(404).json({
        message: "No consultations found for this user.",
      });
    }

    return res.status(200).json(appointments);
  } catch (error) {
    console.error("Error fetching consultations:", error);

    return res.status(500).json({
      message: "Error fetching consultations",
      error: error.message,
    });
  }
};
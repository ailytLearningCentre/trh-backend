const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Consultation = require("../models/Consultation");

exports.submitForm = async (req, res) => {
  try {
    const phone = req.user.phone;
    const { name, age, weight, height, alternativePhoneNumber } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      phone,
      { name, age, weight, height: { value: height }, alternativePhoneNumber },
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
    const { selectedCondition, otherCondition, questionnaireResponses } = req.body;

    if (!selectedCondition) return res.status(400).json({ message: "Health condition is required" });

    let user = await User.findById(phone);
    if (!user) return res.status(404).json({ message: "User not found" });

    const existingCondition = user.healthConditions.find(c => c.conditionName === selectedCondition);

    if (existingCondition) {
      existingCondition.questionnaireResponses = questionnaireResponses || [];
    } else {
      user.healthConditions.push({
        conditionName: selectedCondition,
        questionnaireResponses: questionnaireResponses || [],
      });
    }

    if (selectedCondition === "Others" && otherCondition) {
      user.healthConditions.push({
        conditionName: otherCondition,
        questionnaireResponses: questionnaireResponses || [],
      });
    }

    await user.save();
    res.status(200).json({ message: "Health data submitted successfully", user });
  } catch (error) {
    res.status(500).json({ error: "Internal server error", details: error.message });
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

//const authenticateUser = require("../middleware/authenticateUser"); // Ensure this middleware is imported

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
    (res.status500).json({ message: "Error fetching user details", error: error.message });
  }
};
exports.updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params
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
    console.error("Error updating user details:", error); // Log the full error object
    res.status(500).json({ message: "Error updating user details", error: error.message });
  }
};

exports.deleteUserAccount = async (req, res) => {
  try {
    const { id } = req.params; // Extract user ID from the request parameters

    // Find and delete the user
    const deletedUser = await User.findByIdAndDelete({ _id: id });
    if (!deletedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Delete all related appointments
    await Appointment.deleteMany({ _id: id });

    res.status(200).json({ message: "User account and related data deleted successfully" });
  } catch (error) {
    console.error("Error deleting user account:", error.message);
    res.status(500).json({ message: "Error deleting user account", error: error.message });
  }
};

exports.getUserConsultations = async (req, res) => {
  try {
    const { userId } = req.params; // Extract user ID from the request parameters

    // Find consultations for the given user ID
    const consultations = await Consultation.find({ userId });

    if (!consultations || consultations.length === 0) {
      return res.status(404).json({ message: "No consultations found for this user." });
    }

    res.status(200).json(consultations);
  } catch (error) {
    console.error("Error fetching consultations:", error);
    res.status(500).json({ message: "Error fetching consultations", error: error.message });
  }
};

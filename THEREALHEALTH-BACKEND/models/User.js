const mongoose = require("mongoose");

const QuestionnaireSchema = new mongoose.Schema({
  question: String,
  answer: String,
});

const HealthConditionSchema = new mongoose.Schema({
  conditionName: String,
  questionnaireResponses: [QuestionnaireSchema],
});

const userSchema = new mongoose.Schema({
  _id: String, // Phone number
  name: String,
  age: Number,
  gender: {
    type: String,
    enum: ["Male", "Female", "Other"],
    required: false,
  },
  weight: Number,
  height: { value: Number },
  alternativePhoneNumber: { type: String, unique: true, sparse: true },

  // FIXED: added doctor role
  role: {
    type: String,
    enum: ["user", "admin", "doctor"],
    default: "user",
  },

  healthConditions: [HealthConditionSchema],
  appointments: [{ type: String, ref: "Appointment" }],
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
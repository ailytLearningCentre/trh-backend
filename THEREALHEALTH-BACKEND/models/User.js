const mongoose = require("mongoose");

const QuestionnaireSchema = new mongoose.Schema({
  question: String,
  answer: String,
});

const HealthConditionSchema = new mongoose.Schema({
  conditionName: String,
  questionnaireResponses: [QuestionnaireSchema],
});

const userSchema = new mongoose.Schema(
  {
    _id: String,
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
    email: {
      type: String,
      lowercase: true,
      trim: true,
      unique: true,
      sparse: true,
    },
    googleId: { type: String, unique: true, sparse: true },
    role: { type: String, enum: ["user", "admin", "doctor"], default: "user" },
    healthConditions: [HealthConditionSchema],
    appointments: [{ type: String, ref: "Appointment" }],

    // Minimal doctor information. These fields are used only when role === "doctor".
    profileImage: { type: String, default: "" },
    defaultWorkingDays: {
      type: [String],
      default: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    },
    defaultWorkingHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "17:00" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);

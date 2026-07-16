const mongoose = require("mongoose");

const questionnaireSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      default: "",
    },
    answer: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const healthConditionSchema = new mongoose.Schema(
  {
    conditionName: {
      type: String,
      required: true,
    },
    questionnaireResponses: {
      type: [questionnaireSchema],
      default: [],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },

    name: {
      type: String,
      default: "",
    },

    age: Number,

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },

    weight: Number,

    height: {
      value: Number,
    },

    alternativePhoneNumber: {
      type: String,
      unique: true,
      sparse: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "doctor"],
      default: "user",
    },

    healthConditions: {
      type: [healthConditionSchema],
      default: [],
    },

    appointments: [
      {
        type: String,
        ref: "Appointment",
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);
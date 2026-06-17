const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    medicineName: { type: String, default: "" },
    dosage: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: String,
      default: "",
    },

    userName: {
      type: String,
      required: true,
    },

    userPhone: {
      type: String,
      default: "",
    },

    doctorName: {
      type: String,
      default: "",
    },

    date: {
      type: String,
      required: true,
    },

    timeSlot: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "approved",
        "completed",
        "cancelled",
        "canceled",
        "rejected",
      ],
      default: "pending",
    },

    notes: {
      type: String,
      default: "",
    },

    prescription: [prescriptionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
const mongoose = require("mongoose");

const prescriptionSchema = new mongoose.Schema(
  {
    medicineName: { type: String, default: "" },
    dosage: { type: String, default: "" },
    duration: { type: String, default: "" },
  },
  { _id: false }
);

const consultationSchema = new mongoose.Schema(
  {
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      unique: true,
      sparse: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    userName: {
      type: String,
      default: "User",
    },

    userPhone: {
      type: String,
      default: "",
    },

    doctorName: {
      type: String,
      default: "Doctor",
    },

    date: {
      type: String,
      required: true,
    },

    timeSlot: {
      type: String,
      default: "",
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
      default: "No doctor notes added.",
    },

    prescription: [prescriptionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Consultation", consultationSchema);
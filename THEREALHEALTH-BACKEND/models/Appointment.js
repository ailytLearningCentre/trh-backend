const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    userName: {
      type: String,
      default: "User",
    },
    userPhone: {
      type: String,
      required: true,
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
      enum: ["pending", "confirmed", "completed", "cancelled", "canceled", "rejected"],
      default: "pending",
    },
    notes: {
      type: String,
      default: "",
    },
    prescription: {
      type: [
        {
          medicineName: { type: String, default: "" },
          dosage: { type: String, default: "" },
          duration: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

appointmentSchema.index({ date: 1, timeSlot: 1 }, { unique: true });

module.exports = mongoose.model("Appointment", appointmentSchema);